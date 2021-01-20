import React, { useEffect, useState } from 'react'
import { UploadedFile } from '../types'
import { useWebRTC } from './WebRTCProvider'
import useFetch from 'use-http'
import Peer, { DataConnection } from 'peerjs'
import { decodeMessage, Message, MessageType } from '../messages'
import produce from 'immer'
import * as t from 'io-ts'

enum UploaderConnectionStatus {
  Pending = 'PENDING',
  Uploading = 'UPLOADING',
  Done = 'DONE',
  InvalidPassword = 'INVALID_PASSWORD',
  Closed = 'CLOSED',
  Paused = 'PAUSED',
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
}

const RENEW_INTERVAL = 5000 // 20 minutes

function useUploaderChannel(
  uploaderPeerID: string,
): {
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

function useUploaderConnections(
  peer: Peer,
  files: UploadedFile[],
  password: string,
): Array<UploaderConnection> {
  const [connections, setConnections] = useState<Array<UploaderConnection>>([])

  useEffect(() => {
    peer.on('connection', (conn: DataConnection) => {
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

            fn(updatedConn)
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

                draft.status = UploaderConnectionStatus.Uploading
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
                }
              })

              const request: t.TypeOf<typeof Message> = {
                type: MessageType.Info,
                files: fileInfo,
              }
              conn.send(request)

              // TODO(@kern): Handle sending chunks
              break
            }
          }
        } catch (err) {
          console.error(err)
        }
      })

      conn.on('close', (): void => {
        updateConnection((draft) => {
          if (draft.status === UploaderConnectionStatus.InvalidPassword) {
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

  if (!longSlug || !shortSlug) {
    return null
  }

  const longURL = `/download/${longSlug}`
  const shortURL = `/download/${shortSlug}`

  const items = files.map((f) => <li key={f.fullPath}>{f.fullPath}</li>)
  return (
    <>
      <div>
        Long:
        <a href={longURL} target="_blank">
          {longURL}
        </a>
      </div>
      <div>
        Short:
        <a href={shortURL} target="_blank">
          {shortURL}
        </a>
      </div>
      <ul>{items}</ul>
      <h2>Connections</h2>
      <ul>
        {connections.map((conn) => (
          <li>
            {conn.status} {conn.browserName} {conn.browserVersion}
          </li>
        ))}
      </ul>
    </>
  )
}
