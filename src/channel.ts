import 'server-only'
import config from './config'
import Redis from 'ioredis'
import { generateShortSlug, generateLongSlug } from './slugs'

export type Channel = {
  uploaderPeerID: string
  longSlug: string
  shortSlug: string
}

export interface ChannelRepo {
  create(uploaderPeerID: string, ttl?: number): Promise<Channel>
  fetch(slug: string): Promise<Channel | null>
  renew(slug: string, ttl: number): Promise<void>
  destroy(slug: string): Promise<void>
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis.Redis

  constructor(redisURL: string) {
    this.client = new Redis(redisURL)
  }

  async create(
    uploaderPeerID: string,
    ttl: number = config.channel.ttl,
  ): Promise<Channel> {
    const shortSlug = await this.generateShortSlug()
    const longSlug = await this.generateLongSlug()

    const channel: Channel = {
      uploaderPeerID,
      longSlug,
      shortSlug,
    }
    const channelStr = this.serializeChannel(channel)

    await this.client.setex(this.getLongSlugKey(longSlug), ttl, channelStr)
    await this.client.setex(this.getShortSlugKey(shortSlug), ttl, channelStr)

    return channel
  }

  async fetch(slug: string): Promise<Channel | null> {
    const shortChannelStr = await this.client.get(this.getShortSlugKey(slug))
    if (shortChannelStr) {
      return this.deserializeChannel(shortChannelStr)
    }

    const longChannelStr = await this.client.get(this.getLongSlugKey(slug))
    if (longChannelStr) {
      return this.deserializeChannel(longChannelStr)
    }

    return null
  }

  async renew(slug: string, ttl: number = config.channel.ttl): Promise<void> {
    const channel = await this.fetch(slug)
    if (!channel) {
      return
    }

    await this.client.expire(this.getShortSlugKey(channel.shortSlug), ttl)
    await this.client.expire(this.getLongSlugKey(channel.longSlug), ttl)
  }

  async destroy(slug: string): Promise<void> {
    const channel = await this.fetch(slug)
    if (!channel) {
      return
    }

    await this.client.del(channel.longSlug)
    await this.client.del(channel.shortSlug)
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

  private deserializeChannel(str: string): Channel {
    return JSON.parse(str) as Channel
  }
}

export const channelRepo = new RedisChannelRepo(config.redisURL)
