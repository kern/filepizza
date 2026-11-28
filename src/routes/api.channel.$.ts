import { createFileRoute } from '@tanstack/react-router'
import { getOrCreateChannelRepo } from '../channel'

// Looks up the uploader behind a share link's slug (short or long). The
// download page does the same through a server function; this plain endpoint
// is for clients that aren't a browser, such as the command line client.
export const GET = async ({
  params,
}: {
  params: { _splat?: string }
}): Promise<Response> => {
  const slug = params._splat ?? ''
  const channel = slug
    ? await getOrCreateChannelRepo().fetchChannel(slug)
    : null

  if (!channel) {
    return Response.json({ error: 'Channel not found' }, { status: 404 })
  }
  return Response.json({ uploaderPeerID: channel.uploaderPeerID })
}

export const Route = createFileRoute('/api/channel/$')({
  server: { handlers: { GET } },
})
