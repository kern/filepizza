import React, { useEffect, useState } from 'react'
import { UploadedFile } from '../types'
import { useWebRTC } from './WebRTCProvider'
import useFetch from 'use-http'
import Peer, { DataConnection } from 'peerjs'
import { decodeMessage, Message, MessageType } from '../messages'
import QRCode from 'react-qr-code'
import produce from 'immer'
import * as t from 'io-ts'
import Loading from './Loading'
import ProgressBar from './ProgressBar'
import useClipboard from '../hooks/useClipboard'
import InputLabel from './InputLabel'

enum UploaderConnectionStatus {
  Pending = 'PENDING',
  Paused = 'PAUSED',
  Uploading = 'UPLOADING',
  Done = 'DONE',
  InvalidPassword = 'INVALID_PASSWORD',
  Closed = 'CLOSED',
}

type UploaderConnection = {
  status: UploaderConnectionStatus
  dataConnection: DataConnection
  browserName?: string
  browserVersion?: string
  osName?: string
  osVersion?: string
  mobileVendor?: string
  mobileModel?: string
  uploadingFullPath?: string
  uploadingOffset?: number
}

// TODO(@kern): Use better values
const RENEW_INTERVAL = 5000 // 20 minutes
const MAX_CHUNK_SIZE = 10 * 1024 * 1024 // 10 Mi
const QR_CODE_SIZE = 128

function useUploaderChannel(uploaderPeerID: string): {
  loading: boolean
  error: Error | null
  longSlug: string
  shortSlug: string
} {
  const { loading, error, data } = useFetch(
    '/api/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploaderPeerID }),
    },
    [uploaderPeerID],
  )

  if (!data) {
    return { loading, error, longSlug: null, shortSlug: null }
  }

  return {
    loading: false,
    error: null,
    longSlug: data.longSlug,
    shortSlug: data.shortSlug,
  }
}

function useUploaderChannelRenewal(shortSlug: string): void {
  const { post } = useFetch('/api/renew')

  useEffect(() => {
    let timeout = null

    const run = (): void => {
      timeout = setTimeout(() => {
        post({ slug: shortSlug })
          .then(() => {
            run()
          })
          .catch((err) => {
            console.error(err)
            run()
          })
      }, RENEW_INTERVAL)
    }

    run()

    return () => {
      clearTimeout(timeout)
    }
  }, [shortSlug])
}

function validateOffset(
  files: UploadedFile[],
  fullPath: string,
  offset: number,
): UploadedFile {
  const validFile = files.find(
    (file) => file.fullPath === fullPath && offset <= file.size,
  )
  if (!validFile) {
    throw new Error('invalid file offset')
  }
  return validFile
}

function useUploaderConnections(
  peer: Peer,
  files: UploadedFile[],
  password: string,
): Array<UploaderConnection> {
  const [connections, setConnections] = useState<Array<UploaderConnection>>([])

  useEffect(() => {
    peer.on('connection', (conn: DataConnection) => {
      let sendChunkTimeout: number | null = null
      const newConn = {
        status: UploaderConnectionStatus.Pending,
        dataConnection: conn,
      }

      setConnections((conns) => [...conns, newConn])
      const updateConnection = (
        fn: (draftConn: UploaderConnection) => void,
      ) => {
        setConnections((conns) =>
          produce(conns, (draft) => {
            const updatedConn = draft.find((c) => c.dataConnection === conn)
            if (!updatedConn) {
              return
            }

            fn(updatedConn as UploaderConnection)
          }),
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
                    return
                  }

                  draft.status = UploaderConnectionStatus.InvalidPassword
                  draft.browserName = message.browserName
                  draft.browserVersion = message.browserVersion
                  draft.osName = message.osName
                  draft.osVersion = message.osVersion
                  draft.mobileVendor = message.mobileVendor
                  draft.mobileModel = message.mobileModel
                })

                return
              }

              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Pending) {
                  return
                }

                draft.status = UploaderConnectionStatus.Paused
                draft.browserName = message.browserName
                draft.browserVersion = message.browserVersion
                draft.osName = message.osName
                draft.osVersion = message.osVersion
                draft.mobileVendor = message.mobileVendor
                draft.mobileModel = message.mobileModel
              })

              const fileInfo = files.map((f) => {
                return {
                  fullPath: f.fullPath,
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
              const fullPath = message.fullPath
              let offset = message.offset
              const file = validateOffset(files, fullPath, offset)
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Paused) {
                  return
                }

                draft.status = UploaderConnectionStatus.Uploading
                draft.uploadingFullPath = fullPath
                draft.uploadingOffset = offset
              })

              const sendNextChunk = () => {
                const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                const chunkSize = end - offset
                const final = chunkSize < MAX_CHUNK_SIZE
                const request: t.TypeOf<typeof Message> = {
                  type: MessageType.Chunk,
                  fullPath,
                  offset,
                  bytes: file.slice(offset, end),
                  final,
                }
                conn.send(request)

                updateConnection((draft) => {
                  offset = end
                  draft.uploadingOffset = end

                  if (final) {
                    draft.status = UploaderConnectionStatus.Paused
                  } else {
                    sendChunkTimeout = window.setTimeout(() => {
                      sendNextChunk()
                    }, 0)
                  }
                })
              }
              sendNextChunk()

              break
            }

            case MessageType.Pause: {
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Uploading) {
                  return
                }

                draft.status = UploaderConnectionStatus.Paused
                if (sendChunkTimeout) {
                  clearTimeout(sendChunkTimeout)
                  sendChunkTimeout = null
                }
              })
              break
            }

            case MessageType.Done: {
              updateConnection((draft) => {
                if (draft.status !== UploaderConnectionStatus.Paused) {
                  return
                }

                draft.status = UploaderConnectionStatus.Done
                conn.close()
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
            return
          }

          draft.status = UploaderConnectionStatus.Closed
        })
      })
    })
  }, [peer, files, password])

  return connections
}

export default function Uploader({
  files,
  password,
}: {
  files: UploadedFile[]
  password: string
}): JSX.Element {
  const peer = useWebRTC()
  const { longSlug, shortSlug } = useUploaderChannel(peer.id)
  useUploaderChannelRenewal(shortSlug)
  const connections = useUploaderConnections(peer, files, password)

  const hostPrefix =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (['80', '443'].includes(window.location.port)
      ? ''
      : ':' + window.location.port)
  const longURL = `${hostPrefix}/download/${longSlug}`
  const shortURL = `${hostPrefix}/download/${shortSlug}`
  const { hasCopied: hasCopiedLongURL, onCopy: onCopyLongURL } =
    useClipboard(longURL)
  const { hasCopied: hasCopiedShortURL, onCopy: onCopyShortURL } =
    useClipboard(shortURL)

  if (!longSlug || !shortSlug) {
    return <Loading text="Creating channel" />
  }

  return (
    <>
      <div className="flex w-full items-center">
        <div className="flex-none mr-4">
          <QRCode value={shortURL} size={QR_CODE_SIZE} />
        </div>
        <div className="flex-auto flex flex-col justify-center space-y-2">
          <div className="flex flex-col w-full">
            <InputLabel>Long URL</InputLabel>
            <div className="flex w-full">
              <input
                className="flex-grow px-3 py-2 text-xs border border-r-0 rounded-l"
                value={longURL}
                readOnly
              />
              <button
                className="px-4 py-2 text-sm text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-r border-t border-r border-b"
                onClick={onCopyLongURL}
              >
                {hasCopiedLongURL ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex flex-col w-full mt-2">
            <InputLabel>Short URL</InputLabel>
            <div className="flex w-full">
              <input
                className="flex-grow px-3 py-2 text-xs border border-r-0 rounded-l"
                value={shortURL}
                readOnly
              />
              <button
                className="px-4 py-2 text-sm text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-r border-t border-r border-b"
                onClick={onCopyShortURL}
              >
                {hasCopiedShortURL ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {connections.map((conn, i) => (
        <div key={i} className="w-full mt-4">
          {/* TODO(@kern): Make this look nicer */}
          <div className="text-sm">
            {conn.status} {conn.browserName} {conn.browserVersion}
          </div>
          <ProgressBar value={50} max={100} />
        </div>
      ))}
    </>
  )
}
