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
import { ErrorMessage } from './ErrorMessage'

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
  console.log('[WebRTCProvider] getOrCreateGlobalPeer called')

  if (!globalPeer) {
    console.log('[WebRTCProvider] Creating new global peer')

    const response = await fetch('/api/ice', {
      method: 'POST',
    })
    const { iceServers } = await response.json()
    console.log('[WebRTCProvider] ICE servers:', iceServers)

    let peerConfig: any = {
      debug: 3,
      config: {
        iceServers,
      },
    }

    console.log('[WebRTCProvider] About to fetch /api/peerjs-servers')

    try {
      const peerServersResponse = await fetch('/api/peerjs-servers')
      console.log('[WebRTCProvider] Response status:', peerServersResponse.status)

      if (peerServersResponse.ok) {
        const data = await peerServersResponse.json()
        console.log('[WebRTCProvider] Response data:', data)

        if (data.servers && data.servers.length > 0) {
          const serverUrlString = data.servers[0]
          console.log('[WebRTCProvider] Using server:', serverUrlString)

          const serverUrl = new URL(serverUrlString)
          peerConfig = {
            ...peerConfig,
            host: serverUrl.hostname,
            port: serverUrl.port ? parseInt(serverUrl.port) : (serverUrl.protocol === 'https:' ? 443 : 80),
            path: serverUrl.pathname,
            secure: serverUrl.protocol === 'https:',
          }
          console.log('[WebRTCProvider] Final config:', peerConfig)
        } else {
          console.log('[WebRTCProvider] No servers found, using default')
        }
      } else {
        console.log('[WebRTCProvider] Bad response:', peerServersResponse.status)
      }
    } catch (error) {
      console.error('[WebRTCProvider] Fetch error:', error)
    }

    console.log('[WebRTCProvider] Creating Peer with config:', peerConfig)
    globalPeer = new Peer(peerConfig)
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