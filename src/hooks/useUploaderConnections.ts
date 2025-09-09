import { useState, useEffect } from 'react'
import Peer, { DataConnection } from 'peerjs'
import {
  UploadedFile,
  UploaderConnection,
  UploaderConnectionStatus,
} from '../types'
import {
  decodeMessage,
  Message,
  MessageType,
  ChunkAckMessage,
} from '../messages'
import { z } from 'zod'
import { getFileName } from '../fs'
import { setRotating } from './useRotatingSpinner'

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
    (file) => getFileName(file) === fileName && offset <= file.size,
  )
  if (!validFile) {
    throw new Error('invalid file offset')
  }
  return validFile
}

export function useUploaderConnections(
  peer: Peer,
  files: UploadedFile[],
  password: string,
): Array<UploaderConnection> {
  const [connections, setConnections] = useState<Array<UploaderConnection>>([])

  useEffect(() => {
    console.log(
      '[UploaderConnections] initializing with',
      files.length,
      'files',
    )
    const cleanupHandlers: Array<() => void> = []

    const listener = (conn: DataConnection) => {
      console.log('[UploaderConnections] new connection from peer', conn.peer)
      // If the connection is a report, we need to hard-redirect the uploader to the reported page to prevent them from uploading more files.
      if (conn.metadata?.type === 'report') {
        console.log(
          '[UploaderConnections] received report connection, redirecting',
        )
        // Broadcast report message to all connections
        connections.forEach((c) => {
          c.dataConnection.send({
            type: MessageType.Report,
          })
          c.dataConnection.close()
        })

        // Hard-redirect uploader to reported page
        window.location.href = '/reported'
        return
      }

      let sendChunkTimeout: NodeJS.Timeout | null = null
      const newConn = {
        status: UploaderConnectionStatus.Pending,
        dataConnection: conn,
        completedFiles: 0,
        totalFiles: files.length,
        currentFileProgress: 0,
        acknowledgedBytes: 0,
      }

      setConnections((conns) => {
        return [newConn, ...conns]
      })

      const updateConnection = (
        fn: (c: UploaderConnection) => UploaderConnection,
      ) => {
        setConnections((conns) =>
          conns.map((c) => (c.dataConnection === conn ? fn(c) : c)),
        )
      }

      const onData = (data: any): void => {
        try {
          const message = decodeMessage(data)
          console.log('[UploaderConnections] received message:', message.type)
          switch (message.type) {
            case MessageType.RequestInfo: {
              console.log('[UploaderConnections] client info:', {
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
                console.log(
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

              console.log('[UploaderConnections] sending file info:', fileInfo)
              const request: Message = {
                type: MessageType.Info,
                files: fileInfo,
              }

              conn.send(request)
              break
            }

            case MessageType.UsePassword: {
              console.log('[UploaderConnections] password attempt received')
              const { password: submittedPassword } = message
              if (submittedPassword === password) {
                console.log('[UploaderConnections] password correct')
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
                console.log('[UploaderConnections] password incorrect')
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
              let offset = message.offset
              console.log(
                '[UploaderConnections] starting transfer of',
                fileName,
                'from offset',
                offset,
              )
              const file = validateOffset(files, fileName, offset)

              let chunkCount = 0
              const sendNextChunkAsync = () => {
                sendChunkTimeout = setTimeout(() => {
                  const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                  const final = isFinalChunk(offset, file.size)
                  chunkCount++
                  // Log for e2e testing
                  console.log(
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

                  updateConnection((draft) => {
                    offset = end
                    if (final) {
                      console.log(
                        '[UploaderConnections] completed file',
                        fileName,
                        '- file',
                        draft.completedFiles + 1,
                        'of',
                        draft.totalFiles,
                      )
                      return {
                        ...draft,
                        status: UploaderConnectionStatus.Ready,
                        completedFiles: draft.completedFiles + 1,
                        currentFileProgress: 0,
                      }
                    } else {
                      sendNextChunkAsync()
                      return {
                        ...draft,
                        uploadingOffset: end,
                        currentFileProgress: end / file.size,
                      }
                    }
                  })
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
                  uploadingOffset: offset,
                  acknowledgedBytes: 0, // Reset acknowledged bytes for new file
                  currentFileProgress: 0, // Progress based on acks, not sends
                }
              })

              break
            }

            case MessageType.Pause: {
              console.log('[UploaderConnections] transfer paused')
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
              const ackMessage = message as z.infer<typeof ChunkAckMessage>
              console.log(
                '[UploaderConnections] received chunk ack:',
                ackMessage.fileName,
                'offset',
                ackMessage.offset,
                'bytes',
                ackMessage.bytesReceived,
              )

              updateConnection((draft) => {
                const currentAcked = draft.acknowledgedBytes || 0
                const newAcked = currentAcked + ackMessage.bytesReceived

                // Find the file to calculate progress
                const file = files.find(
                  (f) => getFileName(f) === ackMessage.fileName,
                )
                if (file) {
                  const acknowledgedProgress = newAcked / file.size
                  return {
                    ...draft,
                    acknowledgedBytes: newAcked,
                    currentFileProgress: acknowledgedProgress,
                  }
                }

                return {
                  ...draft,
                  acknowledgedBytes: newAcked,
                }
              })
              break
            }

            case MessageType.Done: {
              console.log(
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
          console.error('[UploaderConnections] error handling message:', err)
        }
      }

      const onClose = (): void => {
        console.log('[UploaderConnections] connection closed')
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
      console.log('[UploaderConnections] cleaning up connections')
      peer.off('connection', listener)
      cleanupHandlers.forEach((fn) => fn())
    }
  }, [peer, files, password])

  return connections
}
