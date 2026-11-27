// @vitest-environment node

import { expect, it, vi } from 'vitest'
import { getRedisClient } from '../../src/redisClient'

it('uses the local Redis defaults when no URL is configured and reuses the client', () => {
  vi.stubEnv('REDIS_URL', '')
  const client = getRedisClient()
  try {
    expect(client.options).toMatchObject({ host: 'localhost', port: 6379 })
    expect(getRedisClient()).toBe(client)
  } finally {
    client.disconnect()
    vi.unstubAllEnvs()
  }
})
