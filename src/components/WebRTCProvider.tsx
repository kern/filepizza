import React, {
  JSX,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import Loading from './Loading'
import Peer, { type PeerOptions } from 'peerjs'
import type { UploaderTransport } from '../types'
import { ErrorMessage } from './ErrorMessage'

type ConnectionEvents = {
  data: [unknown]
  close: []
  open: []
  error: [Error]
}

export interface DownloadTransport extends UploaderTransport {
  on<Event extends keyof ConnectionEvents>(
    event: Event,
    listener: (...args: ConnectionEvents[Event]) => void,
  ): void
  off<Event extends keyof ConnectionEvents>(
    event: Event,
    listener: (...args: ConnectionEvents[Event]) => void,
  ): void
  once(event: 'open', listener: () => void): void
}

type PeerEvents = {
  connection: [UploaderTransport]
  open: [string]
  error: [Error]
}

export interface WebRTCPeer {
  readonly id: string
  connect(
    id: string,
    options?: Parameters<Peer['connect']>[1],
  ): DownloadTransport
  on<Event extends keyof PeerEvents>(
    event: Event,
    listener: (...args: PeerEvents[Event]) => void,
  ): void
  off<Event extends keyof PeerEvents>(
    event: Event,
    listener: (...args: PeerEvents[Event]) => void,
  ): void
  destroy(): void
}

export type WebRTCPeerValue = {
  peer: WebRTCPeer
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

export function createPeerService(
  request: typeof fetch,
  createPeer: (options: PeerOptions) => WebRTCPeer,
) {
  let peer: WebRTCPeer | null = null

  return {
    current: () => peer,
    async get(): Promise<WebRTCPeer> {
      if (!peer) {
        const response = await request('/api/ice', { method: 'POST' })
        const { host, path, iceServers } = await response.json()
        console.log('[WebRTCProvider] ICE servers:', iceServers)
        console.log('[WebRTCProvider] host:', host)
        console.log('[WebRTCProvider] path:', path)
        peer = createPeer({ debug: 3, host, path, config: { iceServers } })
      }

      const currentPeer = peer
      if (!currentPeer.id) {
        await new Promise<void>((resolve) => {
          const listener = (id: string) => {
            console.log('[WebRTCProvider] Peer ID:', id)
            currentPeer.off('open', listener)
            resolve()
          }
          currentPeer.on('open', listener)
        })
      }
      return currentPeer
    },
    stop() {
      peer?.destroy()
      peer = null
    },
  }
}

const browserPeerService = createPeerService(
  (input, init) => fetch(input, init),
  (options) => new Peer(options),
)

export const WebRTCPeerServiceContext = React.createContext(browserPeerService)

export default function WebRTCPeerProvider({
  children,
  service: serviceOverride,
}: {
  children?: React.ReactNode
  service?: ReturnType<typeof createPeerService>
}): JSX.Element {
  const defaultService = useContext(WebRTCPeerServiceContext)
  const service = serviceOverride ?? defaultService
  const [peerValue, setPeerValue] = useState<WebRTCPeer | null>(() =>
    service.current(),
  )
  const [isStopped, setIsStopped] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const stop = useCallback(() => {
    console.log('[WebRTCProvider] Stopping peer')
    service.stop()
    setPeerValue(null)
    setIsStopped(true)
  }, [service])

  useEffect(() => {
    service.get().then(setPeerValue).catch(setError)
  }, [service])

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
