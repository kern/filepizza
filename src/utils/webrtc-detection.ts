/**
 * Detects if WebRTC is available and enabled in the current browser
 */
export function isWebRTCSupported(): boolean {
  // Check if RTCPeerConnection is available
  if (typeof RTCPeerConnection === 'undefined') {
    return false
  }

  // Test if we can actually create an RTCPeerConnection
  // This catches cases where the API exists but is disabled (like Firefox's media.peerconnection.enabled = false)
  try {
    const testConnection = new RTCPeerConnection()
    testConnection.close()
    return true
  } catch (error) {
    console.warn('[WebRTC Detection] RTCPeerConnection creation failed:', error)
    return false
  }
}

/**
 * Gets a user-friendly error message for WebRTC issues
 */
export function getWebRTCErrorMessage(): string {
  if (typeof RTCPeerConnection === 'undefined') {
    return 'Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, Safari, or Edge.'
  }

  // This is likely Firefox with media.peerconnection.enabled = false
  return 'WebRTC is disabled in your browser. In Firefox, please enable it by setting "media.peerconnection.enabled" to true in about:config.'
}
