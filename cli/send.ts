import { createHash, timingSafeEqual } from 'node:crypto'
import { open } from 'node:fs/promises'
import { decodeMessage, MessageType } from '../src/messages'
import type { Message } from '../src/messages'
import type { UploaderTransport } from '../src/types'
import { closeWhenConnectionFails } from '../src/utils/connection-health'
import type { SendFile } from './paths'

// The same sizes the browser uploader uses.
export const MAX_CHUNK_SIZE = 256 * 1024

// How much may be sent before the downloader acknowledges it. The browser
// uploader sends without limit; a terminal client may be sending from a slow
// disk to a slow peer, so it paces itself.
export const IN_FLIGHT_BYTES = 8 * 1024 * 1024

export function isFinalChunk(offset: number, fileSize: number): boolean {
  return offset + MAX_CHUNK_SIZE >= fileSize
}

export type ReadChunk = (
  file: SendFile,
  offset: number,
  length: number,
) => Promise<ArrayBuffer>

export async function readChunkFromDisk(
  file: SendFile,
  offset: number,
  length: number,
): Promise<ArrayBuffer> {
  const handle = await open(file.path, 'r')
  try {
    const buffer = new Uint8Array(length)
    let read = 0
    while (read < length) {
      const { bytesRead } = await handle.read(
        buffer,
        read,
        length - read,
        offset + read,
      )
      if (bytesRead === 0) throw new Error('the file got shorter')
      read += bytesRead
    }
    return buffer.buffer
  } finally {
    await handle.close()
  }
}

export type SendEvent =
  | { type: 'connected'; id: string }
  | { type: 'client'; id: string; description: string }
  | {
      type: 'progress'
      id: string
      fileName: string
      fileIndex: number
      fileCount: number
      bytes: number
      size: number
    }
  | { type: 'file-done'; id: string; fileName: string }
  | { type: 'done'; id: string }
  | { type: 'closed'; id: string }
  | { type: 'wrong-password'; id: string }
  | { type: 'error'; id: string; message: string }
  | { type: 'reported' }

export interface SenderPeer {
  on(
    event: 'connection',
    listener: (connection: UploaderTransport) => void,
  ): void
  off(
    event: 'connection',
    listener: (connection: UploaderTransport) => void,
  ): void
}

export type ServeOptions = {
  password?: string
  report: (event: SendEvent) => void
  readChunk?: ReadChunk
}

type State =
  | 'pending'
  | 'authenticating'
  | 'ready'
  | 'uploading'
  | 'paused'
  | 'done'
  | 'closed'

const digest = (text: string) => createHash('sha256').update(text).digest()

function passwordMatches(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected))
}

function describeClient(
  message: Extract<Message, { type: MessageType.RequestInfo }>,
): string {
  const browser = `${message.browserName} ${message.browserVersion}`.trim()
  const system = `${message.osName} ${message.osVersion}`.trim()
  return [browser, system].filter(Boolean).join(' on ')
}

// Shares `files` with whoever connects to `peer`, speaking the same protocol
// as the browser uploader (docs/file-transfer-protocol.md). Returns a function
// that stops sharing and closes every connection.
export function serveFiles(
  peer: SenderPeer,
  files: SendFile[],
  { password, report, readChunk = readChunkFromDisk }: ServeOptions,
): () => void {
  const connections = new Set<UploaderTransport>()
  const cleanups = new Set<() => void>()

  const serve = (conn: UploaderTransport): void => {
    const id = conn.peer

    if (conn.metadata?.type === 'report') {
      // Same as the browser: tell everyone and stop sharing.
      connections.forEach((other) => {
        other.send({ type: MessageType.Report })
        other.close()
      })
      report({ type: 'reported' })
      return
    }

    report({ type: 'connected', id })
    connections.add(conn)

    let state: State = 'pending'
    // Bumped whenever the transfer is interrupted so that a chunk still being
    // read from disk is dropped instead of sent.
    let transferId = 0
    let running = -1
    let file: SendFile | undefined
    let fileIndex = 0
    let sent = 0
    let acknowledged = 0
    let finalSent = false

    const sendInfo = (): void => {
      conn.send({
        type: MessageType.Info,
        files: files.map(({ fileName, size, type }) => ({
          fileName,
          size,
          type,
        })),
      })
    }

    const pump = async (): Promise<void> => {
      if (running === transferId) return
      const mine = transferId
      running = mine
      try {
        while (
          state === 'uploading' &&
          file &&
          mine === transferId &&
          !finalSent &&
          sent - acknowledged < IN_FLIGHT_BYTES
        ) {
          const current = file
          const offset = sent
          const end = Math.min(current.size, offset + MAX_CHUNK_SIZE)
          const final = isFinalChunk(offset, current.size)

          let bytes: ArrayBuffer
          try {
            bytes = await readChunk(current, offset, end - offset)
          } catch (error) {
            if (mine !== transferId) return
            const message = `The sender could not read ${current.fileName}. Was it moved or changed?`
            conn.send({ type: MessageType.Error, error: message })
            report({
              type: 'error',
              id,
              message: `${message} (${(error as Error).message})`,
            })
            return
          }
          if (mine !== transferId || !conn.open) return

          conn.send({
            type: MessageType.Chunk,
            fileName: current.fileName,
            offset,
            bytes,
            final,
          })
          sent = end
          finalSent = final
        }
      } finally {
        if (running === mine) running = -1
      }
    }

    const handle = (message: Message): void => {
      switch (message.type) {
        case MessageType.RequestInfo: {
          report({
            type: 'client',
            id,
            description: describeClient(message),
          })
          if (password) {
            state = 'authenticating'
            conn.send({ type: MessageType.PasswordRequired })
          } else {
            state = 'ready'
            sendInfo()
          }
          break
        }

        case MessageType.UsePassword: {
          if (state !== 'authenticating') break
          if (
            password !== undefined &&
            passwordMatches(message.password, password)
          ) {
            state = 'ready'
            sendInfo()
          } else {
            report({ type: 'wrong-password', id })
            conn.send({
              type: MessageType.PasswordRequired,
              errorMessage: 'Invalid password',
            })
          }
          break
        }

        case MessageType.Start: {
          if (state !== 'ready' && state !== 'paused') break
          const index = files.findIndex(
            (candidate) => candidate.fileName === message.fileName,
          )
          const { offset } = message
          if (
            index < 0 ||
            !Number.isSafeInteger(offset) ||
            offset < 0 ||
            offset > files[index].size
          ) {
            report({
              type: 'error',
              id,
              message: `Ignored a request for "${message.fileName}" at an invalid offset.`,
            })
            break
          }
          transferId++
          state = 'uploading'
          file = files[index]
          fileIndex = index
          sent = offset
          acknowledged = offset
          finalSent = false
          void pump()
          break
        }

        case MessageType.Pause: {
          if (state !== 'uploading') break
          transferId++
          state = 'paused'
          break
        }

        case MessageType.ChunkAck: {
          if (
            state !== 'uploading' ||
            !file ||
            message.fileName !== file.fileName ||
            message.offset !== acknowledged
          ) {
            break
          }
          const end = message.offset + message.bytesReceived
          if (
            message.bytesReceived !==
              Math.min(MAX_CHUNK_SIZE, file.size - message.offset) ||
            end > sent
          ) {
            break
          }
          acknowledged = end
          report({
            type: 'progress',
            id,
            fileName: file.fileName,
            fileIndex: fileIndex + 1,
            fileCount: files.length,
            bytes: end,
            size: file.size,
          })
          if (end === file.size) {
            report({ type: 'file-done', id, fileName: file.fileName })
            state = 'ready'
          } else {
            void pump()
          }
          break
        }

        case MessageType.Done: {
          if (state !== 'ready') break
          state = 'done'
          report({ type: 'done', id })
          conn.close()
          break
        }
      }
    }

    const onData = (data: unknown): void => {
      try {
        handle(decodeMessage(data))
      } catch (error) {
        report({
          type: 'error',
          id,
          message: `Ignored a message that could not be understood: ${(error as Error).message}`,
        })
      }
    }

    const onClose = (): void => {
      connections.delete(conn)
      transferId++
      if (state !== 'done') {
        state = 'closed'
        report({ type: 'closed', id })
      }
    }

    conn.on('data', onData)
    conn.on('close', onClose)
    const stopWatching = closeWhenConnectionFails(conn)

    const cleanup = (): void => {
      stopWatching()
      transferId++
      conn.off('data', onData)
      conn.off('close', onClose)
      conn.close()
    }
    cleanups.add(cleanup)
  }

  peer.on('connection', serve)

  return () => {
    peer.off('connection', serve)
    cleanups.forEach((cleanup) => cleanup())
    cleanups.clear()
    connections.clear()
  }
}
