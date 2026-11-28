// Must come first: installs the WebRTC globals that PeerJS needs.
import './webrtc'
import { release, platform } from 'node:os'
import type { Peer, PeerOptions } from 'peerjs'
import pkg from '../package.json'
import { formatSize } from '../src/fs'
import { USAGE, UsageError, parseCommand } from './args'
import type { Command } from './args'
import { parseLink } from './links'
import { collectFiles } from './paths'
import { receiveFiles } from './receive'
import type { ReceiveConnection } from './receive'
import { serveFiles } from './send'
import type { SendEvent, SenderPeer } from './send'
import { createTerminal, percent } from './terminal'

type Terminal = ReturnType<typeof createTerminal>

const CONNECT_TIMEOUT_MS = 30_000
const RENEW_INTERVAL_MS = 60_000

class Failure extends Error {}

async function requestJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    throw new Failure(
      `Could not reach ${new URL(url).origin}: ${(error as Error).message}`,
    )
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Not JSON; the status says enough.
  }
  return { status: response.status, body }
}

function postJson(url: string, data: object) {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Signs in to the signalling server the same way the web app does, with the
// settings the server hands out at /api/ice.
async function connectPeer(server: string): Promise<Peer> {
  const { status, body } = await postJson(`${server}/api/ice`, {})
  if (status !== 200 || typeof body !== 'object' || body === null) {
    throw new Failure(`${server} did not answer like a FilePizza server.`)
  }
  const { host, port, path, iceServers } = body as {
    host: string
    port?: number
    path: string
    iceServers: RTCIceServer[]
  }
  const options: PeerOptions = {
    host,
    // An explicit undefined would override PeerJS's default port.
    ...(port ? { port } : {}),
    path,
    secure: server.startsWith('https:'),
    config: { iceServers },
  }
  // Loaded only now: PeerJS decides what WebRTC support there is when it is
  // first imported, so that has to happen after ./webrtc installed it.
  const { Peer: PeerClient } = await import('peerjs')
  const peer = new PeerClient(options)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Failure('Timed out reaching the signalling server.')),
      CONNECT_TIMEOUT_MS,
    )
    peer.once('open', () => {
      clearTimeout(timer)
      resolve()
    })
    peer.once('error', (error) => {
      clearTimeout(timer)
      reject(new Failure(`Signalling server error: ${error.message}`))
    })
  })
  // The signalling connection can drop while a transfer is running. Peers that
  // are already connected don't need it, but new ones do.
  peer.on('disconnected', () => {
    if (!peer.destroyed) peer.reconnect()
  })
  return peer
}

const shortId = (id: string): string => id.slice(0, 8)

function describeSendEvent(event: SendEvent, terminal: Terminal): void {
  switch (event.type) {
    case 'connected':
      terminal.line(`${shortId(event.id)} connected`)
      break
    case 'client':
      terminal.line(
        `${shortId(event.id)} is ${event.description || 'a downloader'}`,
      )
      break
    case 'progress':
      terminal.status(
        `${shortId(event.id)} ${event.fileName} ${percent(event.bytes, event.size)}% (file ${event.fileIndex} of ${event.fileCount})`,
      )
      break
    case 'file-done':
      terminal.line(`${shortId(event.id)} downloaded ${event.fileName}`)
      break
    case 'done':
      terminal.line(`${shortId(event.id)} finished downloading everything`)
      break
    case 'closed':
      terminal.line(`${shortId(event.id)} disconnected`)
      break
    case 'wrong-password':
      terminal.line(`${shortId(event.id)} gave the wrong password`)
      break
    case 'error':
      terminal.line(`${shortId(event.id)}: ${event.message}`)
      break
  }
}

async function send(
  command: Extract<Command, { kind: 'send' }>,
  terminal: Terminal,
): Promise<number> {
  const files = await collectFiles(command.paths)
  const total = files.reduce((sum, file) => sum + file.size, 0)
  terminal.line(
    `Sharing ${files.length} ${files.length === 1 ? 'file' : 'files'} (${formatSize(total)}):`,
  )
  for (const file of files) {
    terminal.line(`  ${file.fileName}  ${formatSize(file.size)}`)
  }

  const peer = await connectPeer(command.server)
  const created = await postJson(`${command.server}/api/create`, {
    uploaderPeerID: peer.id,
  })
  const channel = created.body as {
    secret: string
    shortSlug: string
    longSlug: string
  } | null
  if (created.status !== 200 || !channel?.shortSlug) {
    throw new Failure('The server would not create a share link.')
  }

  terminal.line('')
  terminal.line(`Share link: ${command.server}/download/${channel.shortSlug}`)
  terminal.line(`Long link:  ${command.server}/download/${channel.longSlug}`)
  terminal.line('')
  terminal.line(
    'Keep this running until the downloads finish. Ctrl-C stops sharing.',
  )

  return new Promise<number>((resolve) => {
    let finished = false
    const finish = (code: number): void => {
      if (finished) return
      finished = true
      clearInterval(renew)
      stop()
      terminal.clear()
      // Best effort: the link stops working either way once this exits.
      void postJson(`${command.server}/api/destroy`, {
        slug: channel.shortSlug,
      }).finally(() => {
        peer.destroy()
        resolve(code)
      })
    }

    const stop = serveFiles(peer as unknown as SenderPeer, files, {
      password: command.password,
      report: (event) => {
        if (event.type === 'reported') {
          terminal.line('This share was reported and has been stopped.')
          finish(1)
          return
        }
        describeSendEvent(event, terminal)
        if (event.type === 'done' && command.once) finish(0)
      },
    })
    const renew = setInterval(() => {
      void postJson(`${command.server}/api/renew`, {
        slug: channel.shortSlug,
        secret: channel.secret,
      })
    }, RENEW_INTERVAL_MS)

    process.once('SIGINT', () => {
      terminal.line('Stopped sharing.')
      finish(0)
    })
    process.once('SIGTERM', () => finish(0))
  })
}

async function receive(
  command: Extract<Command, { kind: 'receive' }>,
  terminal: Terminal,
): Promise<number> {
  const { server, slug } = parseLink(command.link, command.server)
  const encoded = slug.split('/').map(encodeURIComponent).join('/')
  const lookup = await requestJson(`${server}/api/channel/${encoded}`)
  if (lookup.status === 404) {
    throw new Failure(
      'That link was not found. It may have expired or been stopped.',
    )
  }
  const uploaderPeerID = (lookup.body as { uploaderPeerID?: string } | null)
    ?.uploaderPeerID
  if (lookup.status !== 200 || !uploaderPeerID) {
    throw new Failure(`${server} did not answer like a FilePizza server.`)
  }

  const peer = await connectPeer(server)
  const conn = peer.connect(uploaderPeerID, { reliable: true })

  let timer: ReturnType<typeof setTimeout> | undefined
  const unreachable = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Failure(
            'Could not connect to the sender. Is the link still open on their side?',
          ),
        ),
      CONNECT_TIMEOUT_MS,
    )
    conn.once('open', () => clearTimeout(timer))
    peer.on('error', (error) =>
      reject(
        new Failure(
          error.type === 'peer-unavailable'
            ? 'The sender is not online any more.'
            : `Connection error: ${error.message}`,
        ),
      ),
    )
  })

  try {
    const received = receiveFiles(conn as unknown as ReceiveConnection, {
      output: command.output,
      force: command.force,
      password: command.password,
      client: {
        name: 'FilePizza CLI',
        version: pkg.version,
        osName: platform(),
        osVersion: release(),
      },
      report: (event) => {
        if (event.type === 'files') {
          const total = event.files.reduce((sum, file) => sum + file.size, 0)
          terminal.line(
            `Receiving ${event.files.length} ${event.files.length === 1 ? 'file' : 'files'} (${formatSize(total)})`,
          )
        } else if (event.type === 'progress') {
          terminal.status(
            `${event.fileName} ${percent(event.bytes, event.size)}% (file ${event.fileIndex} of ${event.fileCount}, ${percent(event.totalBytes, event.totalSize)}% overall)`,
          )
        } else {
          terminal.line(`Saved ${event.path}`)
        }
      },
    })
    await Promise.race([received, unreachable])
    terminal.clear()
    terminal.line('Done.')
    return 0
  } finally {
    clearTimeout(timer)
    peer.destroy()
  }
}

async function run(argv: string[]): Promise<number> {
  const terminal = createTerminal(process.stdout)
  const command = parseCommand(argv, process.env)

  switch (command.kind) {
    case 'help':
      process.stdout.write(USAGE)
      return 0
    case 'version':
      process.stdout.write(`${pkg.version}\n`)
      return 0
    case 'send':
      return send(command, terminal)
    case 'receive':
      return receive(command, terminal)
  }
}

try {
  process.exit(await run(process.argv.slice(2)))
} catch (error) {
  process.stdout.write('\r\x1b[K')
  if (error instanceof UsageError) {
    process.stderr.write(`${error.message}\n`)
    process.exit(2)
  }
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
}
