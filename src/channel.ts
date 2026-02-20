import 'server-only'
import config from './config'
import { Redis, getRedisClient } from './redisClient'
import { generateShortSlug, generateLongSlug } from './slugs'
import crypto from 'crypto'
import { z } from 'zod'

export type Channel = {
  secret?: string
  longSlug: string
  shortSlug: string
  uploaderPeerID: string
  sharedSlug?: string
  additionalUploaders?: string[]
}

const ChannelSchema = z.object({
  secret: z.string().optional(),
  longSlug: z.string(),
  shortSlug: z.string(),
  uploaderPeerID: z.string(),
  sharedSlug: z.string().optional(),
  additionalUploaders: z.array(z.string()).optional()
})

export interface ChannelRepo {
  createChannel(uploaderPeerID: string, ttl?: number, sharedSlug?: string): Promise<Channel>
  fetchChannel(slug: string): Promise<Channel | null>
  renewChannel(slug: string, secret: string, ttl?: number): Promise<boolean>
  destroyChannel(slug: string): Promise<void>
}

function getShortSlugKey(shortSlug: string): string {
  return `short:${shortSlug}`
}

function getLongSlugKey(longSlug: string): string {
  return `long:${longSlug}`
}

async function generateShortSlugUntilUnique(
  checkExists: (key: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < config.shortSlug.maxAttempts; i++) {
    const slug = await generateShortSlug()
    const exists = await checkExists(getShortSlugKey(slug))
    if (!exists) {
      return slug
    }
  }

  throw new Error('max attempts reached generating short slug')
}

async function generateLongSlugUntilUnique(
  checkExists: (key: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < config.longSlug.maxAttempts; i++) {
    const slug = await generateLongSlug()
    const exists = await checkExists(getLongSlugKey(slug))
    if (!exists) {
      return slug
    }
  }

  throw new Error('max attempts reached generating long slug')
}

function serializeChannel(channel: Channel): string {
  return JSON.stringify(channel)
}

function deserializeChannel(str: string, scrubSecret = false): Channel {
  const parsedChannel = JSON.parse(str)
  const validatedChannel = ChannelSchema.parse(parsedChannel)
  if (scrubSecret) {
    return { ...validatedChannel, secret: undefined }
  }
  return validatedChannel
}

type MemoryStoredChannel = {
  channel: Channel
  expiresAt: number
}

export class MemoryChannelRepo implements ChannelRepo {
  private channels: Map<string, MemoryStoredChannel> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  private setChannelTimeout(slug: string, ttl: number) {
    const existingTimeout = this.timeouts.get(slug)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const timeout = setTimeout(() => {
      this.channels.delete(slug)
      this.timeouts.delete(slug)
    }, ttl * 1000)

    this.timeouts.set(slug, timeout)
  }

  async createChannel(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
    sharedSlug?: string,
  ): Promise<Channel> {
    const shortSlug = await generateShortSlugUntilUnique(async (key) =>
      this.channels.has(key),
    )

    const longSlug = await generateLongSlugUntilUnique(async (key) =>
      this.channels.has(key),
    )

    if (sharedSlug) {
      const sharedKey = getLongSlugKey(sharedSlug)
      const existingStoredChannel = this.channels.get(sharedKey)

      if (existingStoredChannel) {
        const updatedChannel: Channel = {
          secret: crypto.randomUUID(),
          longSlug,
          shortSlug,
          uploaderPeerID,
          sharedSlug
        }

        const expiresAt = Date.now() + ttl * 1000
        const storedChannel = { channel: updatedChannel, expiresAt }

        const shortKey = getShortSlugKey(shortSlug)
        const longKey = getLongSlugKey(longSlug)
        this.channels.set(shortKey, storedChannel)
        this.channels.set(longKey, storedChannel)

        const existingChannel = {...existingStoredChannel.channel}
        existingChannel.additionalUploaders = [
          ...(existingChannel.additionalUploaders || []),
          uploaderPeerID
        ]
        this.channels.set(sharedKey, {
          channel: existingChannel,
          expiresAt: expiresAt
        })

        this.setChannelTimeout(shortKey, ttl)
        this.setChannelTimeout(longKey, ttl)
        this.setChannelTimeout(sharedKey, ttl)

        return updatedChannel
      }
    }

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
      uploaderPeerID,
      sharedSlug
    }

    const expiresAt = Date.now() + ttl * 1000
    const storedChannel = { channel, expiresAt }

    const shortKey = getShortSlugKey(shortSlug)
    const longKey = getLongSlugKey(longSlug)

    this.channels.set(shortKey, storedChannel)
    this.channels.set(longKey, storedChannel)

    if (sharedSlug) {
      const sharedKey = getLongSlugKey(sharedSlug)
      this.channels.set(sharedKey, storedChannel)
      this.setChannelTimeout(sharedKey, ttl)
    }

    this.setChannelTimeout(shortKey, ttl)
    this.setChannelTimeout(longKey, ttl)

    return channel
  }

  async fetchChannel(
    slug: string,
    scrubSecret = false,
  ): Promise<Channel | null> {
    const shortKey = getShortSlugKey(slug)
    const shortChannel = this.channels.get(shortKey)
    if (shortChannel) {
      return scrubSecret
        ? { ...shortChannel.channel, secret: undefined }
        : shortChannel.channel
    }

    const longKey = getLongSlugKey(slug)
    const longChannel = this.channels.get(longKey)
    if (longChannel) {
      return scrubSecret
        ? { ...longChannel.channel, secret: undefined }
        : longChannel.channel
    }

    return null
  }

  async renewChannel(
    slug: string,
    secret: string,
    ttl: number = config.channel.ttl,
  ): Promise<boolean> {
    const channel = await this.fetchChannel(slug)
    if (!channel || channel.secret !== secret) {
      return false
    }

    const expiresAt = Date.now() + ttl * 1000
    const storedChannel = { channel, expiresAt }

    const shortKey = getShortSlugKey(channel.shortSlug)
    const longKey = getLongSlugKey(channel.longSlug)

    this.channels.set(longKey, storedChannel)
    this.channels.set(shortKey, storedChannel)

    if (channel.sharedSlug) {
      const sharedKey = getLongSlugKey(channel.sharedSlug)
      this.channels.set(sharedKey, storedChannel)
      this.setChannelTimeout(sharedKey, ttl)
    }

    this.setChannelTimeout(shortKey, ttl)
    this.setChannelTimeout(longKey, ttl)

    return true
  }

  async destroyChannel(slug: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return
    }

    const shortKey = getShortSlugKey(channel.shortSlug)
    const longKey = getLongSlugKey(channel.longSlug)

    const shortTimeout = this.timeouts.get(shortKey)
    if (shortTimeout) {
      clearTimeout(shortTimeout)
      this.timeouts.delete(shortKey)
    }

    const longTimeout = this.timeouts.get(longKey)
    if (longTimeout) {
      clearTimeout(longTimeout)
      this.timeouts.delete(longKey)
    }

    if (channel.sharedSlug) {
      const sharedKey = getLongSlugKey(channel.sharedSlug)
      const sharedTimeout = this.timeouts.get(sharedKey)
      if (sharedTimeout) {
        clearTimeout(sharedTimeout)
        this.timeouts.delete(sharedKey)
      }
      this.channels.delete(sharedKey)
    }

    this.channels.delete(longKey)
    this.channels.delete(shortKey)
  }
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis

  constructor() {
    this.client = getRedisClient()
  }

  async createChannel(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
    sharedSlug?: string,
  ): Promise<Channel> {
    const shortSlug = await generateShortSlugUntilUnique(
      async (key) => (await this.client.get(key)) !== null,
    )

    const longSlug = await generateLongSlugUntilUnique(
      async (key) => (await this.client.get(key)) !== null,
    )

    if (sharedSlug) {
      const existingChannelStr = await this.client.get(getLongSlugKey(sharedSlug))
      if (existingChannelStr) {
        const existingChannel = deserializeChannel(existingChannelStr)

        const updatedChannel: Channel = {
          secret: crypto.randomUUID(),
          longSlug,
          shortSlug,
          uploaderPeerID,
          sharedSlug
        }
        const channelStr = serializeChannel(updatedChannel)

        await this.client.setex(getLongSlugKey(longSlug), ttl, channelStr)
        await this.client.setex(getShortSlugKey(shortSlug), ttl, channelStr)

        const updatedSharedChannel = {
          ...existingChannel,
          additionalUploaders: [
            ...(existingChannel.additionalUploaders || []),
            uploaderPeerID
          ]
        }
        const updatedSharedStr = serializeChannel(updatedSharedChannel)
        await this.client.setex(getLongSlugKey(sharedSlug), ttl, updatedSharedStr)

        return updatedChannel
      }
    }

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
      uploaderPeerID,
      sharedSlug
    }
    const channelStr = serializeChannel(channel)

    await this.client.setex(getLongSlugKey(longSlug), ttl, channelStr)
    await this.client.setex(getShortSlugKey(shortSlug), ttl, channelStr)

    if (sharedSlug) {
      await this.client.setex(getLongSlugKey(sharedSlug), ttl, channelStr)
    }

    return channel
  }

  async fetchChannel(
    slug: string,
    scrubSecret = false,
  ): Promise<Channel | null> {
    const shortChannelStr = await this.client.get(getShortSlugKey(slug))
    if (shortChannelStr) {
      return deserializeChannel(shortChannelStr, scrubSecret)
    }

    const longChannelStr = await this.client.get(getLongSlugKey(slug))
    if (longChannelStr) {
      return deserializeChannel(longChannelStr, scrubSecret)
    }

    return null
  }

  async renewChannel(
    slug: string,
    secret: string,
    ttl: number = config.channel.ttl,
  ): Promise<boolean> {
    const channel = await this.fetchChannel(slug)
    if (!channel || channel.secret !== secret) {
      return false
    }

    await this.client.expire(getLongSlugKey(channel.longSlug), ttl)
    await this.client.expire(getShortSlugKey(channel.shortSlug), ttl)

    if (channel.sharedSlug) {
      await this.client.expire(getLongSlugKey(channel.sharedSlug), ttl)
    }

    return true
  }

  async destroyChannel(slug: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return
    }

    await this.client.del(getLongSlugKey(channel.longSlug))
    await this.client.del(getShortSlugKey(channel.shortSlug))

    if (channel.sharedSlug) {
      await this.client.del(getLongSlugKey(channel.sharedSlug))
    }
  }
}

let _channelRepo: ChannelRepo | null = null

export function getOrCreateChannelRepo(): ChannelRepo {
  if (!_channelRepo) {
    if (process.env.REDIS_URL) {
      _channelRepo = new RedisChannelRepo()
      console.log('[ChannelRepo] Using Redis storage')
    } else {
      _channelRepo = new MemoryChannelRepo()
      console.log('[ChannelRepo] Using in-memory storage')
    }
  }
  return _channelRepo
}