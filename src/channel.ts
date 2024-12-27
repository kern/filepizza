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
  createChannel(ttl?: number): Promise<Channel>
  fetchChannel(slug: string): Promise<Channel | null>
  renewChannel(
    slug: string,
    secret: string,
    ttl: number,
  ): Promise<Record<string, RTCSessionDescriptionInit>>
  destroyChannel(slug: string, secret: string): Promise<void>
  offer(
    slug: string,
    offer: RTCSessionDescriptionInit,
    ttl: number,
  ): Promise<string>
  answer(
    slug: string,
    offerID: string,
    answer: RTCSessionDescriptionInit,
    ttl: number,
  ): Promise<boolean>
  fetchAnswer(slug: string, offerID: string): Promise<RTCSessionDescriptionInit | null>
}

export class RedisChannelRepo implements ChannelRepo {
  client: Redis.Redis

  constructor(redisURL: string) {
    this.client = new Redis(redisURL)
  }

  async createChannel(ttl: number = config.channel.ttl): Promise<Channel> {
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
  ): Promise<Record<string, RTCSessionDescriptionInit>> {
    const channel = await this.fetchChannel(slug)
    if (!channel || channel.secret !== secret) {
      return {}
    }

    await this.client.expire(this.getLongSlugKey(channel.longSlug), ttl)
    await this.client.expire(this.getShortSlugKey(channel.shortSlug), ttl)

    const offerKey = this.getOfferKey(channel.shortSlug)
    const offers = await this.client.hgetall(offerKey)
    return Object.fromEntries(
      Object.entries(offers).map(([offerID, offer]) => [offerID, JSON.parse(offer)]),
    ) as Record<string, RTCSessionDescriptionInit>
  }

  async destroyChannel(slug: string, secret: string): Promise<void> {
    const channel = await this.fetchChannel(slug)
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
  ): Promise<string> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return ''
    }

    const offerID = crypto.randomUUID()
    const offerKey = this.getOfferKey(channel.shortSlug)
    await this.client.hset(offerKey, offerID, JSON.stringify(offer))
    await this.client.expire(offerKey, ttl)

    return offerID
  }

  async answer(
    slug: string,
    offerID: string,
    answer: RTCSessionDescriptionInit,
    ttl: number = config.channel.ttl,
  ): Promise<boolean> {
    const channel = await this.fetchChannel(slug)
    if (!channel) {
      return false
    }

    const answerKey = this.getAnswerKey(channel.shortSlug, offerID)
    await this.client.setex(answerKey, ttl, JSON.stringify(answer))

    const offerKey = this.getOfferKey(channel.shortSlug)
    await this.client.hdel(offerKey, offerID)

    return true
  }

  async fetchAnswer(slug: string, offerID: string): Promise<RTCSessionDescriptionInit | null> {
    const answerKey = this.getAnswerKey(slug, offerID)
    const answer = await this.client.get(answerKey)
    if (answer) {
      return JSON.parse(answer) as RTCSessionDescriptionInit
    }

    return null
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

  private getAnswerKey(shortSlug: string, offerID: string): string {
    return `answers:${shortSlug}:${offerID}`
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
