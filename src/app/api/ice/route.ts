import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { setTurnCredentials } from '../../../coturn'

const turnHost = process.env.TURN_HOST || '127.0.0.1'
const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'

export async function POST(): Promise<NextResponse> {
  if (!process.env.COTURN_ENABLED) {
    return NextResponse.json({
      iceServers: [{ urls: stunServer }],
    })
  }

  // Generate ephemeral credentials
  const username = crypto.randomBytes(8).toString('hex')
  const password = crypto.randomBytes(8).toString('hex')
  const ttl = 86400 // 24 hours

  // Store credentials in Redis
  await setTurnCredentials(username, password, ttl)

  return NextResponse.json({
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
