import { createFileRoute } from '@tanstack/react-router'
import { getOrCreateChannelRepo } from '../channel'

export const POST = async ({
  request,
}: {
  request: Request
}): Promise<Response> => {
  const { slug, secret } = await request.json()

  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!secret) {
    return Response.json({ error: 'Secret is required' }, { status: 400 })
  }

  const success = await getOrCreateChannelRepo().renewChannel(slug, secret)
  return Response.json({ success })
}

export const Route = createFileRoute('/api/renew')({
  server: { handlers: { POST } },
})
