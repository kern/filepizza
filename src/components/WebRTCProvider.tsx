'use client'

import React, {
  JSX,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import Loading from './Loading'
import Peer from 'peerjs'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls:
        process.env.NEXT_PUBLIC_STUN_SERVER ?? 'stun:stun.l.google.com:19302',
    },
  ],
}

export type WebRTCPeerValue = {
  peer: Peer
  stop: () => void
}

const WebRTCContext = React.createContext<WebRTCPeerValue | null>(null)

export const useWebRTCPeer = (): WebRTCPeerValue => {
  const value = useContext(WebRTCContext)
  if (value === null) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return value
}

let globalPeer: Peer | null = null

async function getOrCreateGlobalPeer(): Promise<Peer> {
  if (!globalPeer) {
    globalPeer = new Peer({
      config: ICE_SERVERS,
    })
  }

  if (globalPeer.id) {
    return globalPeer
  }

  await new Promise<void>((resolve) => {
    const listener = (id: string) => {
      console.log('[WebRTCProvider] Peer ID:', id)
      globalPeer?.off('open', listener)
      resolve()
    }
    globalPeer?.on('open', listener)
  })

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return globalPeer!
}

export default function WebRTCPeerProvider({
  children,
}: {
  children?: React.ReactNode
}): JSX.Element {
  const [peerValue, setPeerValue] = useState<Peer | null>(globalPeer)
  const [isStopped, setIsStopped] = useState(false)

  const stop = useCallback(() => {
    globalPeer?.destroy()
    globalPeer = null
    setPeerValue(null)
    setIsStopped(true)
  }, [])

  useEffect(() => {
    getOrCreateGlobalPeer().then(setPeerValue)
  }, [])

  const value = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => ({ peer: peerValue!, stop }),
    [peerValue, stop],
  )

  if (isStopped) {
    return <></>
  }

  if (!peerValue) {
    return <Loading text="Initializing WebRTC peer..." />
  }

  return (
    <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>
  )
}
