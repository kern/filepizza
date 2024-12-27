'use client'

import React, { useState, useEffect, useContext } from 'react'
import Loading from './Loading'
import Peer from 'peerjs'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: process.env.NEXT_PUBLIC_STUN_SERVER ?? 'stun:stun.l.google.com:19302' }],
}

export type WebRTCValue = Peer

const WebRTCContext = React.createContext<WebRTCValue | null>(null)

export const useWebRTC = (): WebRTCValue => {
  const value = useContext(WebRTCContext)
  if (value === null) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return value
}

let globalPeer: Peer | null = null

async function getPeer(): Promise<Peer> {
  if (!globalPeer) {
    globalPeer = new Peer({
      config: ICE_SERVERS,
    })
  }

  if (globalPeer.id) {
    return globalPeer
  }

  await new Promise<void>((resolve) => {
    globalPeer?.on('open', (id) => {
      console.log('[WebRTCProvider] Peer ID:', id)
      resolve()
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return globalPeer!
}

export function WebRTCProvider({
  children,
}: {
  children?: React.ReactNode
}): JSX.Element {
  const [peerConnection, setPeerConnection] = useState<Peer | null>(globalPeer)

  useEffect(() => {
    getPeer().then((pc) => {
      setPeerConnection(pc)
    })

    return () => {
      setPeerConnection(null)
    }
  }, [])

  if (!peerConnection) {
    return <Loading text="Initializing WebRTC connection..." />
  }

  return (
    <WebRTCContext.Provider value={peerConnection}>
      {children}
    </WebRTCContext.Provider>
  )
}

export default WebRTCProvider
