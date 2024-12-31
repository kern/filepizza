import Redis from 'ioredis'

export { Redis }

let redisClient: Redis.Redis | null = null

export function getRedisClient(): Redis.Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL)
  }
  return redisClient
}
