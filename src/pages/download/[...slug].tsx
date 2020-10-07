import React from 'react'
import WebRTCProvider from '../../components/WebRTCProvider'
import { useRouter } from 'next/router'
import Downloader from '../../components/Downloader'
import { NextPage } from 'next'

const DownloadPage: NextPage = () => {
  const router = useRouter()
  const { slug } = router.query

  return (
    <WebRTCProvider>
      <>
        <div>{JSON.stringify(slug)}</div>
        <Downloader roomName="my-room" />
      </>
    </WebRTCProvider>
  )
}

DownloadPage.getInitialProps = () => {
  return {}
}

export default DownloadPage
