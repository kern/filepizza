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
import Peer, { PeerError } from 'peerjs'
import { ErrorMessage } from './ErrorMessage'

export type WebRTCPeerValue = {
  peer: Peer
  stop: () => void
}

export const WEBRTC_UNSUPPORTED_MESSAGE =
  'WebRTC is disabled or not supported in this browser. Enable WebRTC (in Firefox: set media.peerconnection.enabled to true) and reload the page.'

const WebRTCContext = React.createContext<WebRTCPeerValue | null>(null)

export const useWebRTCPeer = (): WebRTCPeerValue => {
  const value = useContext(WebRTCContext)
  if (value === null) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return value
}

/** True when the browser exposes RTCPeerConnection (false if WebRTC is disabled). */
export function isWebRTCSupported(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function'
  )
}

function peerErrorMessage(err: unknown): string {
  const type =
    err && typeof err === 'object' && 'type' in err
      ? String((err as PeerError<string>).type)
      : ''
  if (type === 'browser-incompatible') {
    return WEBRTC_UNSUPPORTED_MESSAGE
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return WEBRTC_UNSUPPORTED_MESSAGE
}

let globalPeer: Peer | null = null

async function getOrCreateGlobalPeer(): Promise<Peer> {
  if (!isWebRTCSupported()) {
    throw new Error(WEBRTC_UNSUPPORTED_MESSAGE)
  }

  if (!globalPeer) {
    const response = await fetch('/api/ice', {
      method: 'POST',
    })
    const { host, path, iceServers } = await response.json()
    console.log('[WebRTCProvider] ICE servers:', iceServers)
    console.log('[WebRTCProvider] host:', host)
    console.log('[WebRTCProvider] path:', path)

    globalPeer = new Peer({
      debug: 3,
      host,
      path,
      config: {
        iceServers,
      },
    })
  }

  if (globalPeer.id) {
    return globalPeer
  }

  await new Promise<void>((resolve, reject) => {
    const onOpen = (id: string) => {
      console.log('[WebRTCProvider] Peer ID:', id)
      globalPeer?.off('open', onOpen)
      globalPeer?.off('error', onError)
      resolve()
    }
    const onError = (err: unknown) => {
      globalPeer?.off('open', onOpen)
      globalPeer?.off('error', onError)
      reject(new Error(peerErrorMessage(err)))
    }
    globalPeer?.on('open', onOpen)
    globalPeer?.on('error', onError)
  })

  return globalPeer
}

export default function WebRTCPeerProvider({
  children,
}: {
  children?: React.ReactNode
}): JSX.Element {
  const [peerValue, setPeerValue] = useState<Peer | null>(globalPeer)
  const [isStopped, setIsStopped] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const stop = useCallback(() => {
    console.log('[WebRTCProvider] Stopping peer')
    globalPeer?.destroy()
    globalPeer = null
    setPeerValue(null)
    setIsStopped(true)
  }, [])

  useEffect(() => {
    getOrCreateGlobalPeer().then(setPeerValue).catch(setError)
  }, [])

  const value = useMemo(() => ({ peer: peerValue!, stop }), [peerValue, stop])

  if (error) {
    return <ErrorMessage message={error.message} />
  }

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
