import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { setTurnCredentials } from '../../../coturn'

const ICE_RATE_LIMIT_WINDOW_MS = 60_000
const ICE_RATE_LIMIT_MAX_REQUESTS = 10

type IceRateLimitEntry = {
  count: number
  expiresAt: number
}

const iceRateLimitStore =
  (globalThis as typeof globalThis & { __iceRateLimitStore?: Map<string, IceRateLimitEntry> }).__iceRateLimitStore ||
  new Map<string, IceRateLimitEntry>()
;(globalThis as typeof globalThis & { __iceRateLimitStore?: Map<string, IceRateLimitEntry> }).__iceRateLimitStore = iceRateLimitStore

const turnHost = process.env.TURN_HOST || '127.0.0.1'
const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
const peerjsHost = process.env.PEERJS_HOST || '0.peerjs.com'
const peerjsPath = process.env.PEERJS_PATH || '/'

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.COTURN_ENABLED) {
    return NextResponse.json({
      host: peerjsHost,
      path: peerjsPath,
      iceServers: [{ urls: stunServer }],
    })
  }

  const expectedToken = process.env.ICE_API_TOKEN
  const providedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  const now = Date.now()
  const rateLimitEntry = iceRateLimitStore.get(ip)

  if (!rateLimitEntry || rateLimitEntry.expiresAt <= now) {
    iceRateLimitStore.set(ip, { count: 1, expiresAt: now + ICE_RATE_LIMIT_WINDOW_MS })
  } else if (rateLimitEntry.count >= ICE_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  } else {
    rateLimitEntry.count += 1
    iceRateLimitStore.set(ip, rateLimitEntry)
  }

  const username = crypto.randomBytes(8).toString('hex')
  const password = crypto.randomBytes(8).toString('hex')
  const ttl = 600

  await setTurnCredentials(username, password, ttl)

  return NextResponse.json({
    host: peerjsHost,
    path: peerjsPath,
    iceServers: [
      { urls: stunServer },
      {
        urls: [`turn:${turnHost}:3478`, `turns:${turnHost}:5349`],
        username,
        credential: password,
      },
    ],
  })
}
