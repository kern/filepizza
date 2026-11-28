import type { FileHandle } from 'node:fs/promises'
import { mkdir, open, stat, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { decodeMessage, MessageType } from '../src/messages'
import type { Message } from '../src/messages'
import { OrderedChunkWriter, toUint8Array } from '../src/utils/ordered-chunks'
import { safeRelativePath } from './paths'

export interface ReceiveConnection {
  readonly open: boolean
  send(message: Message): void
  close(): void
  on(event: 'open' | 'close', listener: () => void): void
  on(event: 'data', listener: (data: unknown) => void): void
  on(event: 'error', listener: (error: Error) => void): void
}

export type ClientInfo = {
  name: string
  version: string
  osName: string
  osVersion: string
}

export type ReceiveEvent =
  | { type: 'files'; files: Array<{ fileName: string; size: number }> }
  | {
      type: 'progress'
      fileName: string
      fileIndex: number
      fileCount: number
      bytes: number
      size: number
      totalBytes: number
      totalSize: number
    }
  | { type: 'file-done'; fileName: string; path: string }

export type ReceiveOptions = {
  output: string
  force: boolean
  password?: string
  client: ClientInfo
  report?: (event: ReceiveEvent) => void
}

type Planned = { fileName: string; size: number; destination: string }

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// Downloads everything the sender offers into `options.output`, following the
// protocol in docs/file-transfer-protocol.md. Resolves with the paths written.
// A partly written file is removed if the transfer fails.
export function receiveFiles(
  conn: ReceiveConnection,
  options: ReceiveOptions,
): Promise<string[]> {
  const { client, force, password, report = () => {} } = options
  const root = resolve(options.output)

  return new Promise((resolvePromise, reject) => {
    let settled = false
    let plan: Planned[] = []
    let index = -1
    let totalSize = 0
    let totalBytes = 0
    let writer: OrderedChunkWriter | undefined
    let handle: FileHandle | undefined
    let handlePath: string | undefined
    // Writes happen one after another, and each chunk is acknowledged only
    // once it is on disk, which is what paces the sender.
    let chain: Promise<void> = Promise.resolve()
    const written: string[] = []

    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      const partial = handlePath
      const unfinished = handle
      handle = undefined
      handlePath = undefined
      conn.close()
      // Let queued writes finish before removing the file they were writing.
      void chain
        .then(async () => {
          await unfinished?.close()
          if (partial) await unlink(partial)
        })
        .catch(() => {})
        .finally(() => reject(error))
    }

    const guard = (work: () => Promise<void>): void => {
      chain = chain.then(work).catch((error) => fail(error as Error))
    }

    const startFile = async (): Promise<void> => {
      index++
      if (index === plan.length) {
        settled = true
        conn.send({ type: MessageType.Done })
        conn.close()
        resolvePromise(written)
        return
      }
      const { fileName, size, destination } = plan[index]
      await mkdir(dirname(destination), { recursive: true })
      handle = await open(destination, force ? 'w' : 'wx')
      handlePath = destination
      const mine = handle
      let fileBytes = 0
      writer = new OrderedChunkWriter(
        size,
        (chunk, offset) =>
          guard(async () => {
            await mine.write(chunk)
            fileBytes += chunk.byteLength
            totalBytes += chunk.byteLength
            conn.send({
              type: MessageType.ChunkAck,
              fileName,
              offset,
              bytesReceived: chunk.byteLength,
            })
            report({
              type: 'progress',
              fileName,
              fileIndex: index + 1,
              fileCount: plan.length,
              bytes: fileBytes,
              size,
              totalBytes,
              totalSize,
            })
          }),
        () =>
          guard(async () => {
            await mine.close()
            handle = undefined
            handlePath = undefined
            written.push(destination)
            report({ type: 'file-done', fileName, path: destination })
            await startFile()
          }),
      )
      conn.send({ type: MessageType.Start, fileName, offset: 0 })
    }

    const prepare = async (
      offered: Array<{ fileName: string; size: number }>,
    ): Promise<void> => {
      if (offered.length === 0) {
        throw new Error('The sender is not sharing any files.')
      }
      const planned: Planned[] = []
      const destinations = new Set<string>()
      for (const { fileName, size } of offered) {
        const relative = safeRelativePath(fileName)
        if (relative === null) {
          throw new Error(
            `The sender offered a file with an unsafe name: "${fileName}"`,
          )
        }
        const destination = resolve(root, relative)
        if (destinations.has(destination)) {
          throw new Error(`Cannot save "${fileName}" safely.`)
        }
        destinations.add(destination)
        if (!force && (await exists(destination))) {
          throw new Error(
            `"${relative}" already exists in ${options.output}. Use --force to overwrite it.`,
          )
        }
        planned.push({ fileName, size, destination })
      }
      plan = planned
      totalSize = planned.reduce((sum, { size }) => sum + size, 0)
      report({
        type: 'files',
        files: planned.map(({ fileName, size }) => ({ fileName, size })),
      })
      await startFile()
    }

    const handleMessage = (message: Message): void => {
      switch (message.type) {
        case MessageType.PasswordRequired:
          if (message.errorMessage) {
            fail(new Error('The password was not accepted.'))
          } else if (password === undefined) {
            fail(
              new Error(
                'This transfer needs a password. Give it with --password.',
              ),
            )
          } else {
            conn.send({ type: MessageType.UsePassword, password })
          }
          break

        case MessageType.Info:
          guard(() => prepare(message.files))
          break

        case MessageType.Chunk: {
          if (!writer || message.fileName !== plan[index]?.fileName) break
          try {
            writer.push(
              message.offset,
              toUint8Array(message.bytes),
              message.final,
            )
          } catch (error) {
            fail(error as Error)
          }
          break
        }

        case MessageType.Error:
          fail(new Error(`The sender reported an error: ${message.error}`))
          break

        case MessageType.Report:
          fail(new Error('This transfer was reported and has been stopped.'))
          break
      }
    }

    conn.on('data', (data) => {
      try {
        handleMessage(decodeMessage(data))
      } catch (error) {
        fail(error as Error)
      }
    })
    conn.on('error', (error) => fail(error))
    conn.on('close', () =>
      fail(new Error('The sender disconnected before the transfer finished.')),
    )

    const hello = (): void =>
      conn.send({
        type: MessageType.RequestInfo,
        browserName: client.name,
        browserVersion: client.version,
        osName: client.osName,
        osVersion: client.osVersion,
        mobileVendor: '',
        mobileModel: '',
      })
    if (conn.open) hello()
    else conn.on('open', hello)
  })
}
