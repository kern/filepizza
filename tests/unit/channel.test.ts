// @vitest-environment node

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryChannelRepo, RedisChannelRepo } from '../../src/channel'
import { POST as create } from '../../src/app/api/create/route'
import { POST as destroy } from '../../src/app/api/destroy/route'
import { POST as ice } from '../../src/app/api/ice/route'
import { POST as renew } from '../../src/app/api/renew/route'

function post(body: object) {
  return new NextRequest('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

class ChannelStore {
  entries = new Map<string, string>()
  expirations = new Map<string, number>()
  collisions = 0

  async get(key: string) {
    if (this.collisions > 0) {
      this.collisions--
      return 'occupied'
    }
    return this.entries.get(key) ?? null
  }

  async setex(key: string, ttl: number, value: string) {
    this.entries.set(key, value)
    this.expirations.set(key, ttl)
  }

  async expire(key: string, ttl: number) {
    if (this.entries.has(key)) this.expirations.set(key, ttl)
  }

  async del(key: string) {
    this.entries.delete(key)
    this.expirations.delete(key)
  }
}

describe('channel repositories', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves both slugs, validates renewal and expires both aliases', async () => {
    const repo = new MemoryChannelRepo()
    const channel = await repo.createChannel('test-peer', 2)
    expect(channel.shortSlug).toMatch(/^[a-z0-9]{8}$/)
    expect(channel.longSlug.split('/')).toHaveLength(4)
    expect(await repo.fetchChannel(channel.shortSlug)).toEqual(channel)
    expect(await repo.fetchChannel(channel.longSlug)).toEqual(channel)
    expect(
      (await repo.fetchChannel(channel.shortSlug, true))?.secret,
    ).toBeUndefined()
    expect(
      (await repo.fetchChannel(channel.longSlug, true))?.secret,
    ).toBeUndefined()

    expect(await repo.renewChannel('missing', 'wrong')).toBe(false)
    expect(await repo.renewChannel(channel.shortSlug, 'wrong')).toBe(false)
    vi.advanceTimersByTime(1_000)
    expect(await repo.renewChannel(channel.longSlug, channel.secret!, 3)).toBe(
      true,
    )
    vi.advanceTimersByTime(1_000)
    expect(await repo.fetchChannel(channel.shortSlug)).toEqual(channel)
    vi.advanceTimersByTime(2_000)
    expect(await repo.fetchChannel(channel.shortSlug)).toBeNull()
    expect(await repo.fetchChannel(channel.longSlug)).toBeNull()
  })

  it('deletes both aliases for in-memory channels', async () => {
    const repo = new MemoryChannelRepo()
    const channel = await repo.createChannel('test-peer')
    await repo.destroyChannel(channel.shortSlug)
    expect(await repo.fetchChannel(channel.shortSlug)).toBeNull()
    expect(await repo.fetchChannel(channel.longSlug)).toBeNull()
    await repo.destroyChannel('missing')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('writes both aliases to Redis storage, renews their TTLs and deletes them', async () => {
    const store = new ChannelStore()
    store.collisions = 1
    const repo = new RedisChannelRepo(store)
    const channel = await repo.createChannel('test-peer')
    const shortKey = `short:${channel.shortSlug}`
    const longKey = `long:${channel.longSlug}`
    expect(store.entries.get(shortKey)).toBe(store.entries.get(longKey))
    expect(await repo.fetchChannel(channel.longSlug)).toEqual(channel)
    expect(
      (await repo.fetchChannel(channel.shortSlug, true))?.secret,
    ).toBeUndefined()
    expect(await repo.renewChannel(channel.shortSlug, 'wrong')).toBe(false)
    expect(await repo.renewChannel('missing', 'wrong')).toBe(false)
    expect(await repo.renewChannel(channel.longSlug, channel.secret!)).toBe(
      true,
    )
    expect(
      await repo.renewChannel(channel.shortSlug, channel.secret!, 120),
    ).toBe(true)
    expect(store.expirations.get(shortKey)).toBe(120)
    expect(store.expirations.get(longKey)).toBe(120)
    await repo.destroyChannel(channel.longSlug)
    await repo.destroyChannel('missing')
    expect(store.entries.size).toBe(0)
  })

  it('fails gracefully when either slug cannot be made unique', async () => {
    const store = new ChannelStore()
    store.collisions = 8
    await expect(
      new RedisChannelRepo(store).createChannel('test-peer'),
    ).rejects.toThrow('max attempts reached generating short slug')

    const existingLongSlugs = {
      get: async (key: string) => (key.startsWith('long:') ? 'occupied' : null),
      setex: store.setex.bind(store),
      expire: store.expire.bind(store),
      del: store.del.bind(store),
    }
    await expect(
      new RedisChannelRepo(existingLongSlugs).createChannel('test-peer'),
    ).rejects.toThrow('max attempts reached generating long slug')
  })
})

describe('channel API', () => {
  beforeEach(() => {
    vi.stubEnv('REDIS_URL', '')
    vi.stubEnv('COTURN_ENABLED', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates, renews and destroys a channel through the request handlers', async () => {
    expect((await create(post({}))).status).toBe(400)
    expect((await destroy(post({}))).status).toBe(400)
    expect((await renew(post({}))).status).toBe(400)

    const channel = await (
      await create(post({ uploaderPeerID: 'test-peer' }))
    ).json()
    expect((await renew(post({ slug: channel.shortSlug }))).status).toBe(400)
    expect(
      await (
        await renew(post({ slug: channel.shortSlug, secret: 'wrong' }))
      ).json(),
    ).toEqual({ success: false })
    expect(
      await (
        await renew(post({ slug: channel.shortSlug, secret: channel.secret }))
      ).json(),
    ).toEqual({ success: true })
    expect(
      await (await destroy(post({ slug: channel.longSlug }))).json(),
    ).toEqual({ success: true })
    expect(
      await (
        await renew(post({ slug: channel.shortSlug, secret: channel.secret }))
      ).json(),
    ).toEqual({ success: false })
  })

  it('offers STUN when TURN is disabled', async () => {
    const config = await (await ice()).json()
    expect(config.iceServers).toEqual([
      { urls: expect.stringMatching(/^stun:/) },
    ])
  })
})
