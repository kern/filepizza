'use client'

import React, { useState, useEffect, useRef, useContext } from 'react'
import type { default as PeerType } from 'peerjs'
import Loading from './Loading'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Peer = typeof window !== 'undefined' ? require('peerjs').default : null

export type WebRTCValue = PeerType

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
}

const WebRTCContext = React.createContext<WebRTCValue | null>(null)

export const useWebRTC = (): WebRTCValue => {
  const value = useContext(WebRTCContext)
  if (value === null) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }

  return value
}

export function WebRTCProvider({
  servers = ICE_SERVERS,
  children,
}: {
  servers?: RTCConfiguration
  children?: React.ReactNode
}): JSX.Element {
  const [loaded, setLoaded] = useState(false)
  const peer = useRef<WebRTCValue | null>(null)

  useEffect(() => {
    const effect = async () => {
      const peerConfig: {
        host?: string
        port?: string
        path?: string
        config: RTCConfiguration
      } = {
        config: servers,
      }

      if (process.env.NEXT_PUBLIC_PEERJS_HOST) {
        peerConfig.host = process.env.NEXT_PUBLIC_PEERJS_HOST
        peerConfig.port = process.env.NEXT_PUBLIC_PEERJS_PORT || '9000'
        peerConfig.path = process.env.NEXT_PUBLIC_PEERJS_PATH || '/'
      }

      const peerObj = new Peer(undefined, peerConfig)

      peerObj.on('open', () => {
        peer.current = peerObj
        setLoaded(true)
      })
    }

    effect()
  }, [servers])

  if (!loaded || !peer.current) {
    return <Loading text="Initializing WebRTC" />
  }

  return (
    <WebRTCContext.Provider value={peer.current}>
      {children}
    </WebRTCContext.Provider>
  )
}

export default WebRTCProvider
