interface WatchableConnection {
  readonly peerConnection?: RTCPeerConnection
  close(): void
}

// A closed tab, a dead network or a crashed browser sends nothing, so a data
// channel can look open long after the other side is gone. The browser does
// notice through ICE (Chromium reports 'failed' after about 15 seconds), so
// close the connection when it does and let the normal close handling run.
// Returns a function that stops watching.
export function closeWhenConnectionFails(
  conn: WatchableConnection,
): () => void {
  const pc = conn.peerConnection
  if (!pc) return () => {}

  const check = () => {
    if (pc.iceConnectionState === 'failed' || pc.connectionState === 'failed') {
      conn.close()
    }
  }
  pc.addEventListener('iceconnectionstatechange', check)
  pc.addEventListener('connectionstatechange', check)
  return () => {
    pc.removeEventListener('iceconnectionstatechange', check)
    pc.removeEventListener('connectionstatechange', check)
  }
}
