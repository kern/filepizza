import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { setTurnCredentials } from '../../../coturn'

const turnHost = process.env.TURN_HOST || '127.0.0.1'
const turnPort = parseInt(process.env.TURN_PORT || '3478', 10)
const turnTlsPort = parseInt(process.env.TURN_TLS_PORT || '5349', 10)
const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
const peerjsHost = process.env.PEERJS_HOST || '0.peerjs.com'
const peerjsPath = process.env.PEERJS_PATH || '/'

export async function POST(): Promise<NextResponse> {
  if (!process.env.COTURN_ENABLED) {
    return NextResponse.json({
      host: peerjsHost,
      path: peerjsPath,
      iceServers: [{ urls: stunServer }],
    })
  }

  // Generate ephemeral credentials
  const username = crypto.randomBytes(8).toString('hex')
  const password = crypto.randomBytes(8).toString('hex')
  const ttl = 86400 // 24 hours

  // Store credentials in Redis
  await setTurnCredentials(username, password, ttl)

  const iceServers: { urls: string; username?: string; credential?: string }[] = [
    { urls: stunServer },
    { urls: `turn:${turnHost}:${turnPort}`, username, credential: password },
    { urls: `turn:${turnHost}:${turnPort}?transport=tcp`, username, credential: password },
    { urls: `turns:${turnHost}:${turnTlsPort}?transport=tcp`, username, credential: password },
  ]

  return NextResponse.json({
    host: peerjsHost,
    path: peerjsPath,
    iceServers,
  })
}
