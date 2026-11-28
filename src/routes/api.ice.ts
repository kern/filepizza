import { createFileRoute } from '@tanstack/react-router'
import crypto from 'crypto'
import { setTurnCredentials } from '../coturn'

const CREDENTIAL_TTL = 24 * 60 * 60 // 24 hours, in seconds

// Time-limited credentials for coturn's `use-auth-secret` mode: the username
// is the unix time (in seconds) at which the credential expires, and the
// credential is base64(HMAC-SHA1(secret, username)). coturn recomputes it from
// the shared secret, so nothing needs to be stored.
function sharedSecretCredentials(secret: string) {
  const username = String(Math.floor(Date.now() / 1000) + CREDENTIAL_TTL)
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64')
  return { username, credential }
}

function turnUrls(host: string): string[] {
  const port = process.env.TURN_PORT || '3478'
  const tlsPort = process.env.TURNS_PORT || '5349'
  const transport = process.env.TURN_TRANSPORT
  const suffix =
    transport === 'udp' || transport === 'tcp' ? `?transport=${transport}` : ''
  return [`turn:${host}:${port}${suffix}`, `turns:${host}:${tlsPort}${suffix}`]
}

export async function POST(): Promise<Response> {
  const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
  const peerjsHost = process.env.PEERJS_HOST || '0.peerjs.com'
  const peerjsPath = process.env.PEERJS_PATH || '/'

  if (!process.env.COTURN_ENABLED) {
    return Response.json({
      host: peerjsHost,
      path: peerjsPath,
      iceServers: [{ urls: stunServer }],
    })
  }

  const turnHost = process.env.TURN_HOST || '127.0.0.1'
  const secret = process.env.TURN_SECRET

  let username: string
  let credential: string
  if (secret) {
    ;({ username, credential } = sharedSecretCredentials(secret))
  } else {
    // Generate ephemeral credentials and store them in Redis for coturn.
    username = crypto.randomBytes(8).toString('hex')
    credential = crypto.randomBytes(8).toString('hex')
    await setTurnCredentials(username, credential, CREDENTIAL_TTL)
  }

  return Response.json({
    host: peerjsHost,
    path: peerjsPath,
    iceServers: [
      { urls: stunServer },
      { urls: turnUrls(turnHost), username, credential },
    ],
  })
}

export const Route = createFileRoute('/api/ice')({
  server: { handlers: { POST } },
})
