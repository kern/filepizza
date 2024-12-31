import crypto from 'crypto'
import { getRedisClient } from './redisClient'

function generateHMACKey(
  username: string,
  realm: string,
  password: string,
): string {
  const str = `${username}:${realm}:${password}`
  return crypto.createHash('md5').update(str).digest('hex')
}

export async function setTurnCredentials(
  username: string,
  password: string,
  ttl: number,
): Promise<void> {
  if (!process.env.COTURN_ENABLED) {
    return
  }

  const realm = process.env.TURN_REALM || 'file.pizza'

  if (!realm) {
    throw new Error('TURN_REALM environment variable not set')
  }

  const redis = getRedisClient()

  const hmacKey = generateHMACKey(username, realm, password)
  const key = `turn/realm/${realm}/user/${username}/key`

  await redis.setex(key, ttl, hmacKey)
}
