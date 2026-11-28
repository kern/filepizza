// PeerJS expects the browser's WebRTC classes as globals. Bun has none, so
// install node-datachannel's implementation of them. Import this before
// 'peerjs'.
import * as webrtc from 'node-datachannel/polyfill'

Object.assign(globalThis, {
  RTCPeerConnection: webrtc.RTCPeerConnection,
  RTCSessionDescription: webrtc.RTCSessionDescription,
  RTCIceCandidate: webrtc.RTCIceCandidate,
  RTCDataChannel: webrtc.RTCDataChannel,
})
