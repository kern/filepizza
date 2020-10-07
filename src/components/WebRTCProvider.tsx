import React, { useState, useEffect } from 'react'
import { EventDispatcher } from 'peer-data'
import { PeerDataProvider } from 'react-peer-data'

const dispatcher = new EventDispatcher()
const constraints = { ordered: true }
const signaling = { dispatcher }

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
}

interface Props {
  servers?: RTCConfiguration
  children?: React.ReactNode
}

export const WebRTCProvider: React.FC<Props> = ({
  servers = ICE_SERVERS,
  children,
}: Props) => {
  const [pageLoaded, setPageLoaded] = useState(false)

  useEffect(() => {
    setPageLoaded(true)
  }, [])

  if (!pageLoaded) {
    return null
  }

  return (
    <PeerDataProvider
      servers={servers}
      constraints={constraints}
      signaling={signaling}
    >
      {children}
    </PeerDataProvider>
  )
}

export default WebRTCProvider
