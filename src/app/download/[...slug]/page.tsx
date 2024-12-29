import { JSX } from 'react'
import { notFound } from 'next/navigation'
import { getOrCreateChannelRepo } from '../../../channel'
import Spinner from '../../../components/Spinner'
import Wordmark from '../../../components/Wordmark'
import Downloader from '../../../components/Downloader'
import WebRTCPeerProvider from '../../../components/WebRTCProvider'
import ReportTermsViolationButton from '../../../components/ReportTermsViolationButton'

const normalizeSlug = (rawSlug: string | string[]): string => {
  if (typeof rawSlug === 'string') {
    return rawSlug
  } else {
    return rawSlug.join('/')
  }
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<JSX.Element> {
  const { slug: slugRaw } = await params
  const slug = normalizeSlug(slugRaw)
  const channel = await getOrCreateChannelRepo().fetchChannel(slug)

  if (!channel) {
    notFound()
  }

  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <WebRTCPeerProvider>
        <Downloader uploaderPeerID={channel.uploaderPeerID} />
        <ReportTermsViolationButton
          uploaderPeerID={channel.uploaderPeerID}
          slug={slug}
        />
      </WebRTCPeerProvider>
    </div>
  )
}
