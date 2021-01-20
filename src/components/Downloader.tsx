import React, { useCallback, useEffect, useState } from 'react'
import { useWebRTC } from './WebRTCProvider'
import {
  browserName,
  browserVersion,
  osName,
  osVersion,
  mobileVendor,
  mobileModel,
} from 'react-device-detect'
import * as t from 'io-ts'
import { decodeMessage, Message, MessageType } from '../messages'

export default function Downloader({
  uploaderPeerID,
}: {
  uploaderPeerID: string
}): JSX.Element {
  const peer = useWebRTC()

  const [password, setPassword] = useState('')
  const [shouldAttemptConnection, setShouldAttemptConnection] = useState(false)
  const [open, setOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldAttemptConnection) {
      return
    }

    const conn = peer.connect(uploaderPeerID, {
      reliable: true,
    })

    conn.on('open', () => {
      setOpen(true)

      const request: t.TypeOf<typeof Message> = {
        type: MessageType.Start,
        browserName: browserName,
        browserVersion: browserVersion,
        osName: osName,
        osVersion: osVersion,
        mobileVendor: mobileVendor,
        mobileModel: mobileModel,
        password,
      }

      conn.send(request)
    })

    conn.on('data', (data) => {
      try {
        const message = decodeMessage(data)
        switch (message.type) {
          case MessageType.Info:
            console.log(message)
            break

          case MessageType.Error:
            console.error(message.error)
            setErrorMessage(message.error)
            conn.close()
            break
        }
      } catch (err) {
        console.error(err)
      }
    })

    conn.on('close', () => {
      setOpen(false)
      setShouldAttemptConnection(false)
    })

    return () => {
      if (conn.open) conn.close()
    }
  }, [peer, password, shouldAttemptConnection])

  const handleChangePassword = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value)
    },
    [],
  )

  const handleSubmit = useCallback((ev) => {
    ev.preventDefault()
    setShouldAttemptConnection(true)
  }, [])

  if (open) {
    return <div>Downloading</div>
  }

  if (shouldAttemptConnection) {
    return <div>Loading...</div>
  }

  return (
    <form action="#" method="post" onSubmit={handleSubmit}>
      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
      <input type="password" value={password} onChange={handleChangePassword} />
      <button>Start</button>
    </form>
  )
}
