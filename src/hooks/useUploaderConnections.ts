import { useState, useEffect } from 'react'
import Peer, { DataConnection } from 'peerjs'
import {
  UploadedFile,
  UploaderConnection,
  UploaderConnectionStatus,
} from '../types'
import { decodeMessage, Message, MessageType } from '../messages'
import { getFileName } from '../fs'

// TODO(@kern): Test for better values
const MAX_CHUNK_SIZE = 10 * 1024 * 1024 // 10 Mi

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
    const cleanupHandlers: Array<() => void> = []

    const listener = (conn: DataConnection) => {
      // If the connection is a report, we need to hard-redirect the uploader to the reported page to prevent them from uploading more files.
      if (conn.metadata?.type === 'report') {
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
          switch (message.type) {
            case MessageType.RequestInfo: {
              const newConnectionState = {
                browserName: message.browserName,
                browserVersion: message.browserVersion,
                osName: message.osName,
                osVersion: message.osVersion,
                mobileVendor: message.mobileVendor,
                mobileModel: message.mobileModel,
              }

              if (password) {
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

              const request: Message = {
                type: MessageType.Info,
                files: fileInfo,
              }

              conn.send(request)
              break
            }

            case MessageType.UsePassword: {
              const { password: submittedPassword } = message
              if (submittedPassword === password) {
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
              const file = validateOffset(files, fileName, offset)

              const sendNextChunkAsync = () => {
                sendChunkTimeout = setTimeout(() => {
                  const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                  const chunkSize = end - offset
                  const final = chunkSize < MAX_CHUNK_SIZE
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
                      console.log('final chunk', draft.completedFiles + 1)
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
                if (draft.status !== UploaderConnectionStatus.Ready && draft.status !== UploaderConnectionStatus.Paused) {
                  return draft
                }

                sendNextChunkAsync()

                return {
                  ...draft,
                  status: UploaderConnectionStatus.Uploading,
                  uploadingFileName: fileName,
                  uploadingOffset: offset,
                  currentFileProgress: offset / file.size,
                }
              })

              break
            }

            case MessageType.Pause: {
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

            case MessageType.Done: {
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
          console.error(err)
        }
      }

      const onClose = (): void => {
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
      peer.off('connection', listener)
      cleanupHandlers.forEach((fn) => fn())
    }
  }, [peer, files, password])

  return connections
}
