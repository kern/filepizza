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
}

const ChannelSchema = z.object({
  secret: z.string().optional(),
  longSlug: z.string(),
  shortSlug: z.string(),
})

export interface ChannelRepo {
  create(ttl?: number): Promise<Channel>
  fetch(slug: string): Promise<Channel | null>
  renew(
    slug: string,
    secret: string,
    ttl: number,
  ): Promise<RTCSessionDescriptionInit[]>
  destroy(slug: string, secret: string): Promise<void>
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis.Redis

  constructor(redisURL: string) {
    this.client = new Redis(redisURL)
  }

  async create(ttl: number = config.channel.ttl): Promise<Channel> {
    const shortSlug = await this.generateShortSlug()
    const longSlug = await this.generateLongSlug()

    const channel: Channel = {
      secret: crypto.randomUUID(),
      longSlug,
      shortSlug,
    }
    const channelStr = this.serializeChannel(channel)

    await this.client.setex(this.getLongSlugKey(longSlug), ttl, channelStr)
    await this.client.setex(this.getShortSlugKey(shortSlug), ttl, channelStr)

    return channel
  }

  async fetch(slug: string, scrubSecret = false): Promise<Channel | null> {
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

  async renew(
    slug: string,
    secret: string,
    ttl: number = config.channel.ttl,
  ): Promise<RTCSessionDescriptionInit[]> {
    const channel = await this.fetch(slug)
    if (!channel || channel.secret !== secret) {
      return []
    }

    await this.client.expire(this.getLongSlugKey(channel.longSlug), ttl)
    await this.client.expire(this.getShortSlugKey(channel.shortSlug), ttl)

    const offerKey = this.getOfferKey(channel.shortSlug)
    const offers = await this.client.lrange(offerKey, 0, -1)
    if (offers.length > 0) {
      return offers.map((offer) =>
        JSON.parse(offer),
      ) as RTCSessionDescriptionInit[]
    }

    return []
  }

  async destroy(slug: string, secret: string): Promise<void> {
    const channel = await this.fetch(slug)
    if (!channel || channel.secret !== secret) {
      return
    }

    await this.client.del(this.getLongSlugKey(channel.longSlug))
    await this.client.del(this.getShortSlugKey(channel.shortSlug))
  }

  async offer(
    slug: string,
    offer: RTCSessionDescriptionInit,
    ttl: number = config.channel.ttl,
  ): Promise<void> {
    const channel = await this.fetch(slug)
    if (!channel) {
      return
    }

    const offerKey = this.getOfferKey(channel.shortSlug)
    await this.client.rpush(offerKey, JSON.stringify(offer))
    await this.client.expire(offerKey, ttl)

    await this.client.expire(this.getLongSlugKey(channel.longSlug), ttl)
    await this.client.expire(this.getShortSlugKey(channel.shortSlug), ttl)
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

  private getOfferKey(shortSlug: string): string {
    return `offers:${shortSlug}`
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
