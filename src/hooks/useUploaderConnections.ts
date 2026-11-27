import { useState, useEffect } from 'react'
import {
  UploadedFile,
  UploaderConnection,
  UploaderConnectionStatus,
  UploaderTransport,
} from '../types'
import { decodeMessage, Message, MessageType } from '../messages'
import { getFileName } from '../fs'

// TODO(@kern): Test for better values
export const MAX_CHUNK_SIZE = 256 * 1024 // 256 KB

export function isFinalChunk(offset: number, fileSize: number): boolean {
  return offset + MAX_CHUNK_SIZE >= fileSize
}

function validateOffset(
  files: UploadedFile[],
  fileName: string,
  offset: number,
): UploadedFile {
  const validFile = files.find(
    (file) =>
      getFileName(file) === fileName &&
      Number.isSafeInteger(offset) &&
      offset >= 0 &&
      offset <= file.size,
  )
  if (!validFile) {
    throw new Error('invalid file offset')
  }
  return validFile
}

interface UploaderPeer {
  on(
    event: 'connection',
    listener: (connection: UploaderTransport) => void,
  ): void
  off(
    event: 'connection',
    listener: (connection: UploaderTransport) => void,
  ): void
}

type ConnectionState = UploaderConnection & {
  uploadingOffset: number
  acknowledgedBytes: number
}

export function useUploaderConnections(
  peer: UploaderPeer,
  files: UploadedFile[],
  password: string,
  {
    logger = console,
    location = globalThis.location,
  }: {
    logger?: Pick<Console, 'log' | 'error'>
    location?: Pick<Location, 'href'>
  } = {},
): Array<UploaderConnection> {
  const [connections, setConnections] = useState<ConnectionState[]>([])

  useEffect(() => {
    logger.log('[UploaderConnections] initializing with', files.length, 'files')
    const cleanupHandlers: Array<() => void> = []

    const activeConnections = new Set<UploaderTransport>()

    const listener = (conn: UploaderTransport) => {
      logger.log('[UploaderConnections] new connection from peer', conn.peer)
      // If the connection is a report, we need to hard-redirect the uploader to the reported page to prevent them from uploading more files.
      if (conn.metadata?.type === 'report') {
        logger.log(
          '[UploaderConnections] received report connection, redirecting',
        )
        // Broadcast report message to all connections
        activeConnections.forEach((connection) => {
          connection.send({
            type: MessageType.Report,
          })
          connection.close()
        })

        // Hard-redirect uploader to reported page
        location.href = '/reported'
        return
      }

      activeConnections.add(conn)
      let sendChunkTimeout: NodeJS.Timeout | null = null
      const newConn = {
        status: UploaderConnectionStatus.Pending,
        dataConnection: conn,
        completedFiles: 0,
        totalFiles: files.length,
        currentFileProgress: 0,
        uploadingOffset: 0,
        acknowledgedBytes: 0,
      }

      setConnections((conns) => {
        return [newConn, ...conns]
      })

      const updateConnection = (
        fn: (connection: ConnectionState) => ConnectionState,
      ) => {
        setConnections((conns) =>
          conns.map((c) => (c.dataConnection === conn ? fn(c) : c)),
        )
      }

      const onData = (data: unknown): void => {
        try {
          const message = decodeMessage(data)
          logger.log('[UploaderConnections] received message:', message.type)
          switch (message.type) {
            case MessageType.RequestInfo: {
              logger.log('[UploaderConnections] client info:', {
                browser: `${message.browserName} ${message.browserVersion}`,
                os: `${message.osName} ${message.osVersion}`,
                mobile: message.mobileVendor
                  ? `${message.mobileVendor} ${message.mobileModel}`
                  : 'N/A',
              })
              const newConnectionState = {
                browserName: message.browserName,
                browserVersion: message.browserVersion,
                osName: message.osName,
                osVersion: message.osVersion,
                mobileVendor: message.mobileVendor,
                mobileModel: message.mobileModel,
              }

              if (password) {
                logger.log(
                  '[UploaderConnections] password required, requesting authentication',
                )
                const request: Message = {
                  type: MessageType.PasswordRequired,
                }
                conn.send(request)

                updateConnection((draft) => {
                  if (draft.status !== UploaderConnectionStatus.Pending) {
                    return draft
                  }

                  return {
                    ...draft,
                    ...newConnectionState,
                    status: UploaderConnectionStatus.Authenticating,
                  }
                })

                return
              }

              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Pending) {
                  return draft
                }

                return {
                  ...draft,
                  ...newConnectionState,
                  status: UploaderConnectionStatus.Ready,
                }
              })

              const fileInfo = files.map((f) => {
                return {
                  fileName: getFileName(f),
                  size: f.size,
                  type: f.type,
                }
              })

              logger.log('[UploaderConnections] sending file info:', fileInfo)
              const request: Message = {
                type: MessageType.Info,
                files: fileInfo,
              }

              conn.send(request)
              break
            }

            case MessageType.UsePassword: {
              logger.log('[UploaderConnections] password attempt received')
              const { password: submittedPassword } = message
              if (submittedPassword === password) {
                logger.log('[UploaderConnections] password correct')
                updateConnection((draft) => {
                  if (
                    draft.status !== UploaderConnectionStatus.Authenticating &&
                    draft.status !== UploaderConnectionStatus.InvalidPassword
                  ) {
                    return draft
                  }

                  return {
                    ...draft,
                    status: UploaderConnectionStatus.Ready,
                  }
                })

                const fileInfo = files.map((f) => ({
                  fileName: getFileName(f),
                  size: f.size,
                  type: f.type,
                }))

                const request: Message = {
                  type: MessageType.Info,
                  files: fileInfo,
                }

                conn.send(request)
              } else {
                logger.log('[UploaderConnections] password incorrect')
                updateConnection((draft) => {
                  if (
                    draft.status !== UploaderConnectionStatus.Authenticating
                  ) {
                    return draft
                  }

                  return {
                    ...draft,
                    status: UploaderConnectionStatus.InvalidPassword,
                  }
                })

                const request: Message = {
                  type: MessageType.PasswordRequired,
                  errorMessage: 'Invalid password',
                }
                conn.send(request)
              }
              break
            }

            case MessageType.Start: {
              const fileName = message.fileName
              const startOffset = message.offset
              let offset = startOffset
              logger.log(
                '[UploaderConnections] starting transfer of',
                fileName,
                'from offset',
                offset,
              )
              const file = validateOffset(files, fileName, offset)

              let chunkCount = 0
              const sendNextChunkAsync = () => {
                if (sendChunkTimeout !== null) return

                sendChunkTimeout = setTimeout(() => {
                  sendChunkTimeout = null
                  if (!conn.open) return

                  const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                  const final = isFinalChunk(offset, file.size)
                  chunkCount++
                  // Log for e2e testing
                  logger.log(
                    `[UploaderConnections] sending chunk ${chunkCount} for ${fileName} (${offset}-${end}/${file.size}) final=${final}`,
                  )
                  const request: Message = {
                    type: MessageType.Chunk,
                    fileName,
                    offset,
                    bytes: file.slice(offset, end),
                    final,
                  }
                  conn.send(request)

                  offset = end
                  updateConnection((draft) => ({
                    ...draft,
                    uploadingOffset: end,
                  }))
                  if (!final) {
                    sendNextChunkAsync()
                  }
                }, 0)
              }

              updateConnection((draft) => {
                if (
                  draft.status !== UploaderConnectionStatus.Ready &&
                  draft.status !== UploaderConnectionStatus.Paused
                ) {
                  return draft
                }

                sendNextChunkAsync()

                return {
                  ...draft,
                  status: UploaderConnectionStatus.Uploading,
                  uploadingFileName: fileName,
                  uploadingOffset: startOffset,
                  acknowledgedBytes: startOffset,
                  currentFileProgress:
                    file.size === 0 ? 0 : startOffset / file.size,
                }
              })

              break
            }

            case MessageType.Pause: {
              logger.log('[UploaderConnections] transfer paused')
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Uploading) {
                  return draft
                }

                if (sendChunkTimeout) {
                  clearTimeout(sendChunkTimeout)
                  sendChunkTimeout = null
                }

                return {
                  ...draft,
                  status: UploaderConnectionStatus.Paused,
                }
              })
              break
            }

            case MessageType.ChunkAck: {
              const { fileName, offset, bytesReceived } = message
              logger.log(
                '[UploaderConnections] received chunk ack:',
                fileName,
                'offset',
                offset,
                'bytes',
                bytesReceived,
              )

              const file = files.find((file) => getFileName(file) === fileName)
              if (!file) break

              updateConnection((draft) => {
                if (
                  draft.status !== UploaderConnectionStatus.Uploading ||
                  draft.uploadingFileName !== fileName ||
                  offset !== draft.acknowledgedBytes
                ) {
                  return draft
                }

                const end = offset + bytesReceived
                if (
                  bytesReceived !==
                    Math.min(MAX_CHUNK_SIZE, file.size - offset) ||
                  end > draft.uploadingOffset
                ) {
                  return draft
                }

                if (end === file.size) {
                  return {
                    ...draft,
                    status: UploaderConnectionStatus.Ready,
                    completedFiles: draft.completedFiles + 1,
                    acknowledgedBytes: end,
                    currentFileProgress: 0,
                  }
                }

                return {
                  ...draft,
                  acknowledgedBytes: end,
                  currentFileProgress: end / file.size,
                }
              })
              break
            }

            case MessageType.Done: {
              logger.log(
                '[UploaderConnections] transfer completed successfully',
              )
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Ready) {
                  return draft
                }

                conn.close()
                return {
                  ...draft,
                  status: UploaderConnectionStatus.Done,
                }
              })
              break
            }
          }
        } catch (err) {
          logger.error('[UploaderConnections] error handling message:', err)
        }
      }

      const onClose = (): void => {
        logger.log('[UploaderConnections] connection closed')
        activeConnections.delete(conn)
        if (sendChunkTimeout) {
          clearTimeout(sendChunkTimeout)
        }

        updateConnection((draft) => {
          if (
            [
              UploaderConnectionStatus.InvalidPassword,
              UploaderConnectionStatus.Done,
            ].includes(draft.status)
          ) {
            return draft
          }

          return {
            ...draft,
            status: UploaderConnectionStatus.Closed,
          }
        })
      }

      conn.on('data', onData)
      conn.on('close', onClose)

      cleanupHandlers.push(() => {
        conn.off('data', onData)
        conn.off('close', onClose)
        conn.close()
      })
    }

    peer.on('connection', listener)

    return () => {
      logger.log('[UploaderConnections] cleaning up connections')
      peer.off('connection', listener)
      cleanupHandlers.forEach((fn) => fn())
    }
  }, [peer, files, password, logger, location])

  return connections
}
