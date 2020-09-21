import React, { useState, useEffect } from 'react'
import { EventDispatcher } from 'peer-data'
import { PeerDataProvider } from 'react-peer-data'

export const WebRTCProvider: React.FC = ({ children }) => {
  const [pageLoaded, setPageLoaded] = useState(false)

  useEffect(() => {
    setPageLoaded(true)
  }, [])

  if (!pageLoaded) {
    return null
  }

  return (
    <PeerDataProvider
      servers={{ iceServers: [{ urls: 'stun:stun.1.google.com:19302' }] }}
      constraints={{ ordered: true }}
      signaling={{ dispatcher: new EventDispatcher() }}
    >
      {children}
    </PeerDataProvider>
  )
}

export default WebRTCProvider
