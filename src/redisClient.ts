import Redis from 'ioredis'

export { Redis }

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : new Redis()
  }
  return redisClient
}
