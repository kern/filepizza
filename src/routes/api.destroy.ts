import { createFileRoute } from '@tanstack/react-router'
import { getOrCreateChannelRepo } from '../channel'

export const POST = async ({
  request,
}: {
  request: Request
}): Promise<Response> => {
  const { slug } = await request.json()

  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  // Anyone can destroy a channel if they know the slug. This enables a terms violation reporter to destroy the channel after they report it.

  try {
    await getOrCreateChannelRepo().destroyChannel(slug)
    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: 'Failed to destroy channel' },
      { status: 500 },
    )
  }
}

export const Route = createFileRoute('/api/destroy')({
  server: { handlers: { POST } },
})
