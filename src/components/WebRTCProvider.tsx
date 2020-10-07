import React, { useState, useEffect, useRef, useContext } from 'react'
import type { default as PeerType } from 'peerjs'

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

interface Props {
  servers?: RTCConfiguration
  children?: React.ReactNode
}

const WebRTCContext = React.createContext<WebRTCValue>(null)

export const useWebRTC = (): WebRTCValue => {
  return useContext(WebRTCContext)
}

export const WebRTCProvider: React.FC<Props> = ({
  servers = ICE_SERVERS,
  children,
}: Props) => {
  const [pageLoaded, setPageLoaded] = useState(false)
  const peer = useRef<WebRTCValue>(null)

  useEffect(() => {
    const effect = async () => {
      peer.current = new Peer(undefined, {
        config: servers,
      })
      setPageLoaded(true)
    }

    effect()
  }, [])

  if (!pageLoaded || !peer.current) {
    return null
  }

  return (
    <WebRTCContext.Provider value={peer.current}>
      {children}
    </WebRTCContext.Provider>
  )
}

export default WebRTCProvider
