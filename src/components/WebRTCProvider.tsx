'use client'

import React, { useState, useEffect, useContext } from 'react'
import Loading from './Loading'

export type WebRTCValue = {
  createOffer: () => Promise<RTCSessionDescriptionInit>
  createAnswer: (
    offer: RTCSessionDescriptionInit,
  ) => Promise<RTCSessionDescriptionInit>
  setRemoteDescription: (
    description: RTCSessionDescriptionInit,
  ) => Promise<void>
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  onIceCandidate: (handler: (candidate: RTCIceCandidate | null) => void) => void
  onDataChannel: (handler: (channel: RTCDataChannel) => void) => void
  createDataChannel: (label: string) => RTCDataChannel
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const pc = new RTCPeerConnection(servers)
    setPeerConnection(pc)
    setLoaded(true)

    return () => {
      pc.close()
    }
  }, [servers])

  if (!loaded || !peerConnection) {
    return <Loading text="Initializing WebRTC connection..." />
  }

  const webRTCValue: WebRTCValue = {
    createOffer: async () => {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      return offer
    },
    createAnswer: async (offer) => {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      return answer
    },
    setRemoteDescription: (description) =>
      peerConnection.setRemoteDescription(description),
    addIceCandidate: (candidate) => peerConnection.addIceCandidate(candidate),
    onIceCandidate: (handler) => {
      peerConnection.onicecandidate = (event) => handler(event.candidate)
    },
    onDataChannel: (handler) => {
      peerConnection.ondatachannel = (event) => handler(event.channel)
    },
    createDataChannel: (label) => peerConnection.createDataChannel(label),
  }

  return (
    <WebRTCContext.Provider value={webRTCValue}>
      {children}
    </WebRTCContext.Provider>
  )
}

export default WebRTCProvider
