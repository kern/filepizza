import 'server-only'
import config from './config'
import Redis from 'ioredis'
import { generateShortSlug, generateLongSlug } from './slugs'
import crypto from 'crypto'
import { z } from 'zod'

export type Channel = {
  secret?: string
  longSlug: string
  shortSlug: string
  uploaderPeerID: string
}

const ChannelSchema = z.object({
  secret: z.string().optional(),
  longSlug: z.string(),
  shortSlug: z.string(),
  uploaderPeerID: z.string(),
})

export interface ChannelRepo {
  createChannel(
    uploaderPeerID: string,
    ttl?: number,
  ): Promise<Channel>
  fetchChannel(slug: string): Promise<Channel | null>
  renewChannel(
    slug: string,
    secret: string,
    ttl: number,
  ): Promise<boolean>
  destroyChannel(slug: string, secret: string): Promise<void>
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis.Redis

  constructor(redisURL: string) {
    this.client = new Redis(redisURL)
  }

  async createChannel(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
  ): Promise<Channel> {
    const shortSlug = await this.generateShortSlug()
    const longSlug = await this.generateLongSlug()

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
      uploaderPeerID,
    }
    const channelStr = this.serializeChannel(channel)

    await this.client.setex(this.getLongSlugKey(longSlug), ttl, channelStr)
    await this.client.setex(this.getShortSlugKey(shortSlug), ttl, channelStr)

    return channel
  }

  async fetchChannel(slug: string, scrubSecret = false): Promise<Channel | null> {
    const shortChannelStr = await this.client.get(this.getShortSlugKey(slug))
    if (shortChannelStr) {
      return this.deserializeChannel(shortChannelStr, scrubSecret)
    }

    const longChannelStr = await this.client.get(this.getLongSlugKey(slug))
    if (longChannelStr) {
      return this.deserializeChannel(longChannelStr, scrubSecret)
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

    await this.client.expire(this.getLongSlugKey(channel.longSlug), ttl)
    await this.client.expire(this.getShortSlugKey(channel.shortSlug), ttl)

    return true
  }

  async destroyChannel(slug: string, secret: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
    if (!channel || channel.secret !== secret) {
      return
    }

    await this.client.del(this.getLongSlugKey(channel.longSlug))
    await this.client.del(this.getShortSlugKey(channel.shortSlug))
  }

  private async generateShortSlug(): Promise<string> {
    for (let i = 0; i < config.shortSlug.maxAttempts; i++) {
      const slug = generateShortSlug()
      const currVal = await this.client.get(this.getShortSlugKey(slug))
      if (!currVal) {
        return slug
      }
    }

    throw new Error('max attempts reached generating short slug')
  }

  private async generateLongSlug(): Promise<string> {
    for (let i = 0; i < config.longSlug.maxAttempts; i++) {
      const slug = await generateLongSlug()
      const currVal = await this.client.get(this.getLongSlugKey(slug))
      if (!currVal) {
        return slug
      }
    }

    throw new Error('max attempts reached generating long slug')
  }

  private getShortSlugKey(shortSlug: string): string {
    return `short:${shortSlug}`
  }

  private getLongSlugKey(longSlug: string): string {
    return `long:${longSlug}`
  }

  private serializeChannel(channel: Channel): string {
    return JSON.stringify(channel)
  }

  private deserializeChannel(str: string, scrubSecret = false): Channel {
    const parsedChannel = JSON.parse(str)
    const validatedChannel = ChannelSchema.parse(parsedChannel)
    if (scrubSecret) {
      return { ...validatedChannel, secret: undefined }
    }

    return validatedChannel
  }
}

export const channelRepo = new RedisChannelRepo(config.redisURL)
