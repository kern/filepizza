import React from 'react'
import WebRTCProvider from '../../components/WebRTCProvider'
import Downloader from '../../components/Downloader'
import { NextPage, GetServerSideProps } from 'next'
import { channelRepo } from '../../channel'
import { VStack } from '@chakra-ui/react'
import Spinner from '../../components/Spinner'
import Wordmark from '../../components/Wordmark'

type Props = {
  slug: string
  uploaderPeerID: string
  error?: string
}

const DownloadPage: NextPage<Props> = ({ uploaderPeerID }) => {
  return (
    <VStack spacing="20px" paddingY="40px" w="100%">
      <Spinner direction="down" />
      <Wordmark />
      <WebRTCProvider>
        <Downloader uploaderPeerID={uploaderPeerID} />
      </WebRTCProvider>
    </VStack>
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
