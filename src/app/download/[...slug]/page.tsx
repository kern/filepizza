import { notFound } from 'next/navigation'
import { channelRepo } from '../../../channel'
import Spinner from '../../../components/Spinner'
import Wordmark from '../../../components/Wordmark'
import Downloader from '../../../components/Downloader'
import WebRTCProvider from '../../../components/WebRTCProvider'

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
  params: { slug: string[] }
}): Promise<JSX.Element> {
  const slug = normalizeSlug(params.slug)
  const channel = await channelRepo.fetchChannel(slug)

  if (!channel) {
    notFound()
  }

  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <WebRTCProvider>
        <Downloader uploaderPeerID={channel.uploaderPeerID} />
      </WebRTCProvider>
    </div>
  )
}
