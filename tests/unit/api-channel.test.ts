// @vitest-environment node

import { expect, it } from 'vitest'
import { GET as lookup } from '../../src/routes/api.channel.$'
import { POST as createRoute } from '../../src/routes/api.create'

it('resolves a short or long slug to the uploader and hides everything else', async () => {
  const created = await (
    await createRoute({
      request: new Request('http://localhost/api/create', {
        method: 'POST',
        body: JSON.stringify({ uploaderPeerID: 'peer-123' }),
      }),
    })
  ).json()

  for (const slug of [created.shortSlug, created.longSlug]) {
    const response = await lookup({ params: { _splat: slug } })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ uploaderPeerID: 'peer-123' })
  }
})

it('answers 404 for an unknown or missing slug', async () => {
  for (const params of [{ _splat: 'nothing-here' }, { _splat: '' }, {}]) {
    const response = await lookup({ params })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Channel not found' })
  }
})
