import { createFileRoute } from '@tanstack/react-router'
import { getOrCreateChannelRepo } from '../channel'

export const POST = async ({
  request,
}: {
  request: Request
}): Promise<Response> => {
  const { uploaderPeerID } = await request.json()

  if (!uploaderPeerID) {
    return Response.json(
      { error: 'Uploader peer ID is required' },
      { status: 400 },
    )
  }

  const channel = await getOrCreateChannelRepo().createChannel(uploaderPeerID)
  return Response.json(channel)
}

export const Route = createFileRoute('/api/create')({
  server: { handlers: { POST } },
})
