import React from 'react'
import WebRTCProvider from '../../components/WebRTCProvider'
import Downloader from '../../components/Downloader'
import { NextPage, GetServerSideProps } from 'next'
import { channelRepo } from '../../channel'

type Props = {
  slug: string
  uploaderPeerID: string
  error?: string
}

const DownloadPage: NextPage<Props> = ({ slug, uploaderPeerID }) => {
  return (
    <WebRTCProvider>
      <>
        <div>{slug}</div>
        <div>{uploaderPeerID}</div>
        <Downloader uploaderPeerID={uploaderPeerID} />
      </>
    </WebRTCProvider>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = normalizeSlug(ctx.query.slug)
  const channel = await channelRepo.fetch(slug)

  if (!channel) {
    ctx.res.statusCode = 404
    return {
      props: { slug, uploaderPeerID: '', error: 'not found' },
    }
  }

  return {
    props: { slug, uploaderPeerID: channel.uploaderPeerID },
  }
}

const normalizeSlug = (rawSlug: string | string[]): string => {
  if (typeof rawSlug === 'string') {
    return rawSlug
  } else {
    return rawSlug.join('/')
  }
}

export default DownloadPage
