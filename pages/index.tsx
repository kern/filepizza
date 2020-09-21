import React from 'react'
import WebRTCProvider from '../components/WebRTCProvider'

export const IndexPage: React.FC = () => (
  <WebRTCProvider>
    <>Index page</>
  </WebRTCProvider>
)

export default IndexPage
