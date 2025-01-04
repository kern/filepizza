import 'server-only'
import config from './config'
import { Redis, getRedisClient } from './redisClient'
import {
  generateShortSlug,
  generateLongSlug,
  generateRetrieveCode,
} from './slugs'
import crypto from 'crypto'
import { z } from 'zod'

export type Channel = {
  secret?: string
  longSlug: string
  shortSlug: string
  uploaderPeerID: string
  retrieveCode: string
}

const ChannelSchema = z.object({
  secret: z.string().optional(),
  longSlug: z.string(),
  shortSlug: z.string(),
  uploaderPeerID: z.string(),
  retrieveCode: z.string(),
})

export interface ChannelRepo {
  createChannel(uploaderPeerID: string, ttl?: number): Promise<Channel>
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

function getRetrieveCodeKey(retrieveCode: string): string {
  return `retrieve:${retrieveCode}`
}

async function generateShortSlugUntilUnique(
  checkExists: (key: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < config.shortSlug.maxAttempts; i++) {
    const slug = generateShortSlug()
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

async function generateRetrieveCodeUntilUnique(
  checkExists: (key: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < config.retrieveCodeSlug.maxAttempts; i++) {
    const code = generateRetrieveCode()
    const exists = await checkExists(getRetrieveCodeKey(code))
    if (!exists) {
      return code
    }
  }

  throw new Error('max attempts reached generating retrieve code')
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
    // Clear any existing timeout
    const existingTimeout = this.timeouts.get(slug)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout to remove channel when expired
    const timeout = setTimeout(() => {
      this.channels.delete(slug)
      this.timeouts.delete(slug)
    }, ttl * 1000)

    this.timeouts.set(slug, timeout)
  }

  async createChannel(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
  ): Promise<Channel> {
    const shortSlug = await generateShortSlugUntilUnique(async (key) =>
      this.channels.has(key),
    )
    const longSlug = await generateLongSlugUntilUnique(async (key) =>
      this.channels.has(key),
    )
    const retrieveCode = await generateRetrieveCodeUntilUnique(async (key) =>
      this.channels.has(key),
    )

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
      uploaderPeerID,
      retrieveCode,
    }

    const expiresAt = Date.now() + ttl * 1000
    const storedChannel = { channel, expiresAt }

    const shortKey = getShortSlugKey(shortSlug)
    const longKey = getLongSlugKey(longSlug)
    const retrieveCodeKey = getRetrieveCodeKey(retrieveCode)

    this.channels.set(shortKey, storedChannel)
    this.channels.set(longKey, storedChannel)
    this.channels.set(retrieveCodeKey, storedChannel)

    this.setChannelTimeout(shortKey, ttl)
    this.setChannelTimeout(longKey, ttl)
    this.setChannelTimeout(retrieveCodeKey, ttl)
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

    const retrieveCodeKey = getRetrieveCodeKey(slug)
    const retrieveCodeChannel = this.channels.get(retrieveCodeKey)
    if (retrieveCodeChannel) {
      return scrubSecret
        ? { ...retrieveCodeChannel.channel, secret: undefined }
        : retrieveCodeChannel.channel
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
    const retrieveCodeKey = getRetrieveCodeKey(channel.retrieveCode)

    this.channels.set(longKey, storedChannel)
    this.channels.set(shortKey, storedChannel)
    this.channels.set(retrieveCodeKey, storedChannel)

    this.setChannelTimeout(shortKey, ttl)
    this.setChannelTimeout(longKey, ttl)
    this.setChannelTimeout(retrieveCodeKey, ttl)
    return true
  }

  async destroyChannel(slug: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return
    }

    const shortKey = getShortSlugKey(channel.shortSlug)
    const longKey = getLongSlugKey(channel.longSlug)
    const retrieveCodeKey = getRetrieveCodeKey(channel.retrieveCode)

    // Clear timeouts
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

    const retrieveCodeTimeout = this.timeouts.get(retrieveCodeKey)
    if (retrieveCodeTimeout) {
      clearTimeout(retrieveCodeTimeout)
      this.timeouts.delete(retrieveCodeKey)
    }

    this.channels.delete(longKey)
    this.channels.delete(shortKey)
    this.channels.delete(retrieveCodeKey)
  }
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis.Redis

  constructor() {
    this.client = getRedisClient()
  }

  async createChannel(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
  ): Promise<Channel> {
    const shortSlug = await generateShortSlugUntilUnique(
      async (key) => (await this.client.get(key)) !== null,
    )
    const longSlug = await generateLongSlugUntilUnique(
      async (key) => (await this.client.get(key)) !== null,
    )
    const retrieveCode = await generateRetrieveCodeUntilUnique(
      async (key) => (await this.client.get(key)) !== null,
    )

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
      uploaderPeerID,
      retrieveCode,
    }
    const channelStr = serializeChannel(channel)

    await this.client.setex(getLongSlugKey(longSlug), ttl, channelStr)
    await this.client.setex(getShortSlugKey(shortSlug), ttl, channelStr)
    await this.client.setex(getRetrieveCodeKey(retrieveCode), ttl, channelStr)
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

    const retrieveCodeChannelStr = await this.client.get(
      getRetrieveCodeKey(slug),
    )
    if (retrieveCodeChannelStr) {
      return deserializeChannel(retrieveCodeChannelStr, scrubSecret)
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
    await this.client.expire(getRetrieveCodeKey(channel.retrieveCode), ttl)
    return true
  }

  async destroyChannel(slug: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return
    }

    await this.client.del(getLongSlugKey(channel.longSlug))
    await this.client.del(getShortSlugKey(channel.shortSlug))
    await this.client.del(getRetrieveCodeKey(channel.retrieveCode))
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
