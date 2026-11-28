import { JSX } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import Downloader from '../components/Downloader'
import WebRTCPeerProvider from '../components/WebRTCProvider'
import ReportTermsViolationButton from '../components/ReportTermsViolationButton'

export const fetchChannel = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getOrCreateChannelRepo } = await import('../channel')
    const channel = await getOrCreateChannelRepo().fetchChannel(slug)
    return channel ? { uploaderPeerID: channel.uploaderPeerID } : null
  })

export const Route = createFileRoute('/download/$')({
  loader: async ({ params }) => {
    const slug = params._splat ?? ''
    const channel = await fetchChannel({ data: slug })
    if (!channel) throw notFound()
    return { slug, uploaderPeerID: channel.uploaderPeerID }
  },
  head: () => ({ meta: [{ title: 'FilePizza • Your files, delivered.' }] }),
  component: DownloadPage,
})

export function DownloadPage(): JSX.Element {
  const { slug, uploaderPeerID } = Route.useLoaderData()

  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <WebRTCPeerProvider>
        <Downloader uploaderPeerID={uploaderPeerID} />
        <ReportTermsViolationButton
          uploaderPeerID={uploaderPeerID}
          slug={slug}
        />
      </WebRTCPeerProvider>
    </div>
  )
}
