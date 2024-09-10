import { useState, useEffect } from 'react'
import Peer, { DataConnection } from 'peerjs'
import {
  UploadedFile,
  UploaderConnection,
  UploaderConnectionStatus,
} from '../types'
import { decodeMessage, Message, MessageType } from '../messages'
import * as t from 'io-ts'
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
    const listener = (conn: DataConnection) => {
      let sendChunkTimeout: NodeJS.Timeout | null = null
      const newConn = {
        status: UploaderConnectionStatus.Pending,
        dataConnection: conn,
        completedFiles: 0,
        totalFiles: files.length,
        currentFileProgress: 0,
      }

      setConnections((conns) => [newConn, ...conns])
      const updateConnection = (
        fn: (c: UploaderConnection) => UploaderConnection,
      ) => {
        setConnections((conns) =>
          conns.map((c) => (c.dataConnection === conn ? fn(c) : c)),
        )
      }

      conn.on('data', (data): void => {
        try {
          const message = decodeMessage(data)
          switch (message.type) {
            case MessageType.RequestInfo: {
              if (message.password !== password) {
                const request: t.TypeOf<typeof Message> = {
                  type: MessageType.Error,
                  error: 'Invalid password',
                }

                conn.send(request)

                updateConnection((draft) => {
                  if (draft.status !== UploaderConnectionStatus.Pending) {
                    return draft
                  }

                  return {
                    ...draft,
                    status: UploaderConnectionStatus.InvalidPassword,
                    browserName: message.browserName,
                    browserVersion: message.browserVersion,
                    osName: message.osName,
                    osVersion: message.osVersion,
                    mobileVendor: message.mobileVendor,
                    mobileModel: message.mobileModel,
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
                  status: UploaderConnectionStatus.Paused,
                  browserName: message.browserName,
                  browserVersion: message.browserVersion,
                  osName: message.osName,
                  osVersion: message.osVersion,
                  mobileVendor: message.mobileVendor,
                  mobileModel: message.mobileModel,
                }
              })

              const fileInfo = files.map((f) => {
                return {
                  fileName: f.fileName ?? f.name ?? '',
                  size: f.size,
                  type: f.type,
                }
              })

              const request: t.TypeOf<typeof Message> = {
                type: MessageType.Info,
                files: fileInfo,
              }

              conn.send(request)
              break
            }

            case MessageType.Start: {
              const fileName = message.fileName
              let offset = message.offset
              const file = validateOffset(files, fileName, offset)
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Paused) {
                  return draft
                }

                return {
                  ...draft,
                  status: UploaderConnectionStatus.Uploading,
                  uploadingFileName: fileName,
                  uploadingOffset: offset,
                  currentFileProgress: offset / file.size,
                }
              })

              const sendNextChunk = () => {
                const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                const chunkSize = end - offset
                const final = chunkSize < MAX_CHUNK_SIZE
                const request: t.TypeOf<typeof Message> = {
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
                    return {
                      ...draft,
                      status: UploaderConnectionStatus.Paused,
                      completedFiles: draft.completedFiles + 1,
                      currentFileProgress: 0,
                    }
                  } else {
                    sendChunkTimeout = setTimeout(() => {
                      sendNextChunk()
                    }, 0)
                    return {
                      ...draft,
                      uploadingOffset: end,
                      currentFileProgress: end / file.size,
                    }
                  }
                })
              }
              sendNextChunk()

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
                if (draft.status !== UploaderConnectionStatus.Paused) {
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
      })

      conn.on('close', (): void => {
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
      })
    }

    peer.on('connection', listener)

    return () => {
      peer.off('connection')
    }
  }, [peer, files, password])

  return connections
}
