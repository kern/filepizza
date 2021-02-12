import React, { useState, useEffect, useRef, useContext } from 'react'
import type { default as PeerType } from 'peerjs'
import Loading from './Loading'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Peer = process.browser ? require('peerjs').default : null

export type WebRTCValue = PeerType | null

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
}

const WebRTCContext = React.createContext<WebRTCValue | null>(null)

export const useWebRTC = (): WebRTCValue => {
  return useContext(WebRTCContext)!
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
      const peerObj = new Peer(undefined, {
        host: '/',
        port: '9000',
        config: servers,
      })

      peerObj.on('open', () => {
        peer.current = peerObj
        setLoaded(true)
      })
    }

    effect()
  }, [])

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
