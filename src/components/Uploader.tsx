import React, { useEffect, useState } from 'react'
import { UploadedFile } from '../types'
import { useWebRTC } from './WebRTCProvider'
import { useQuery } from '@tanstack/react-query'
import Peer, { DataConnection } from 'peerjs'
import { decodeMessage, Message, MessageType } from '../messages'
import QRCode from 'react-qr-code'
import produce from 'immer'
import * as t from 'io-ts'
import Loading from './Loading'
import ProgressBar from './ProgressBar'
import useClipboard from '../hooks/useClipboard'
import InputLabel from './InputLabel'
import { useUploaderChannelRenewal } from '../hooks/useUploaderChannelRenewal'

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
  completedFiles: number
  totalFiles: number
  currentFileProgress: number
}

// TODO(@kern): Use better values
const MAX_CHUNK_SIZE = 10 * 1024 * 1024 // 10 Mi
const QR_CODE_SIZE = 128

function generateURL(slug: string): string {
  const hostPrefix =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (['80', '443'].includes(window.location.port)
      ? ''
      : ':' + window.location.port)
  return `${hostPrefix}/download/${slug}`
}

function useUploaderChannel(uploaderPeerID: string): {
  loading: boolean
  error: Error | null
  longSlug: string | undefined
  shortSlug: string | undefined
  longURL: string | undefined
  shortURL: string | undefined
} {
  const { isLoading, error, data } = useQuery({
    queryKey: ['uploaderChannel', uploaderPeerID],
    queryFn: async () => {
      const response = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploaderPeerID }),
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    },
  })

  const longURL = data?.longSlug ? generateURL(data.longSlug) : undefined
  const shortURL = data?.shortSlug ? generateURL(data.shortSlug) : undefined

  return {
    loading: isLoading,
    error: error as Error | null,
    longSlug: data?.longSlug,
    shortSlug: data?.shortSlug,
    longURL,
    shortURL,
  }
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
      let sendChunkTimeout: NodeJS.Timeout | null = null
      const newConn = {
        status: UploaderConnectionStatus.Pending,
        dataConnection: conn,
        completedFiles: 0,
        totalFiles: files.length,
        currentFileProgress: 0,
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
                draft.currentFileProgress = offset / file.size
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
                  draft.currentFileProgress = end / file.size

                  if (final) {
                    draft.status = UploaderConnectionStatus.Paused
                    draft.completedFiles += 1
                    draft.currentFileProgress = 0
                  } else {
                    sendChunkTimeout = setTimeout(() => {
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

function CopyableInput({ label, value }: { label: string; value: string }) {
  const { hasCopied, onCopy } = useClipboard(value)

  return (
    <div className="flex flex-col w-full">
      <InputLabel>{label}</InputLabel>
      <div className="flex w-full">
        <input
          className="flex-grow px-3 py-2 text-xs border border-r-0 rounded-l"
          value={value}
          readOnly
        />
        <button
          className="px-4 py-2 text-sm text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-r border-t border-r border-b"
          onClick={onCopy}
        >
          {hasCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function ConnectionListItem({ conn }: { conn: UploaderConnection }) {
  const getStatusColor = (status: UploaderConnectionStatus) => {
    switch (status) {
      case UploaderConnectionStatus.Uploading:
        return 'bg-green-500'
      case UploaderConnectionStatus.Paused:
        return 'bg-yellow-500'
      case UploaderConnectionStatus.Done:
        return 'bg-blue-500'
      case UploaderConnectionStatus.Closed:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="w-full mt-4">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm font-medium">
          {conn.browserName} {conn.browserVersion}
        </span>
        <span
          className={`px-1.5 py-0.5 text-white rounded-md transition-colors duration-200 font-medium text-[10px] ${getStatusColor(
            conn.status,
          )}`}
        >
          {conn.status}
        </span>
      </div>
      <ProgressBar
        value={
          (conn.completedFiles + conn.currentFileProgress) / conn.totalFiles
        }
        max={1}
      />
    </div>
  )
}

export default function Uploader({
  files,
  password,
  renewInterval = 5000,
}: {
  files: UploadedFile[]
  password: string
  renewInterval?: number
}): JSX.Element {
  const peer = useWebRTC()
  const { longSlug, shortSlug, longURL, shortURL } = useUploaderChannel(peer.id)
  useUploaderChannelRenewal(shortSlug, renewInterval)
  const connections = useUploaderConnections(peer, files, password)

  if (!longSlug || !shortSlug) {
    return <Loading text="Creating channel" />
  }

  return (
    <>
      <div className="flex w-full items-center">
        <div className="flex-none mr-4">
          <QRCode value={shortURL ?? ''} size={QR_CODE_SIZE} />
        </div>
        <div className="flex-auto flex flex-col justify-center space-y-2">
          <CopyableInput label="Long URL" value={longURL ?? ''} />
          <CopyableInput label="Short URL" value={shortURL ?? ''} />
        </div>
      </div>
      {connections.map((conn, i) => (
        <ConnectionListItem key={i} conn={conn} />
      ))}
    </>
  )
}
