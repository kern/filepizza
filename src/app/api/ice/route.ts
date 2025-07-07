import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createHmac } from 'crypto'
import { setTurnCredentials, setTurnCredentials2 } from '../../../coturn'

const stunHost  = process.env.STUN_HOST  || 'stun.l.google.com'
const stunPort  = process.env.STUN_PORT  || 19302
const turnHost  = process.env.TURN_HOST  || '127.0.0.1'
const turnTrans = process.env.TURN_TRANS || 'both' // both = udp and tcp, udp = udp only, tcp = tcp only
const turnCred  = process.env.TURN_CRED  || ''
const turnPort  = process.env.TURN_PORT  || 3478
const turnsPort = process.env.TURNS_PORT || 5349

export async function POST(): Promise<NextResponse> {
  if (!process.env.COTURN_ENABLED) {
    return NextResponse.json({
      iceServers: [{ urls: `stun:${stunHost}:${stunPort}` }],
    })
  }

  // Use hmac to create a password from username and turnCred
  function generateHmacCred(username: string): string {
    return createHmac('sha1', turnCred).update(username).digest('hex')
  }

  // Generate ephemeral credentials
  const ttl = 86400 // 24 hours
  let username: string = ''
  let password: string = ''
  if (!turnCred) {
    username = crypto.randomBytes(8).toString('hex')
    password = crypto.randomBytes(8).toString('hex')
  } else {
    let now: number = Date.now() + ttl
    username = String(now)
    //password = String(turnCred)
    password = generateHmacCred(username)
  }

  // Store stun and turn hosts in an array
  const ar_stun:  string[] = []
  const ar_turn:  string[] = []
  let base_stun:  string   = 'stun:' + stunHost + ':' + stunPort
  let base_turn:  string   = 'turn:' + turnHost + ':' + turnPort
  let base_turns: string   = 'turns:' + turnHost + ':' + turnsPort

  ar_stun.push(base_stun)
  if (turnTrans === 'both') {
    ar_turn.push(base_turn + '?transport=udp')
    ar_turn.push(base_turn + '?transport=tcp')
    ar_turn.push(base_turns + '?transport=udp')
    ar_turn.push(base_turns + '?transport=tcp')
  } else if (turnTrans === 'tcp') {
    ar_turn.push(base_turn + '?transport=tcp')
    ar_turn.push(base_turns + '?transport=tcp')
  } else {
    ar_turn.push(base_turn + '?transport=udp')
    ar_turn.push(base_turns + '?transport=udp')
  }

  // Store credentials in Redis
  if (!turnCred) {
    await setTurnCredentials(username, password, ttl)
  } else {
    await setTurnCredentials2(username, password, ttl)
  }

  return NextResponse.json({
    iceServers: [
      { urls: ar_stun },
      {
        urls: ar_turn,
        username,
        credential: password,
      },
    ],
  })
}
