import { parseArgs } from 'node:util'

export const DEFAULT_SERVER = 'https://file.pizza'

export class UsageError extends Error {}

export type Command =
  | { kind: 'help' }
  | { kind: 'version' }
  | {
      kind: 'send'
      server: string
      password: string | undefined
      once: boolean
      paths: string[]
    }
  | {
      kind: 'receive'
      server: string
      serverGiven: boolean
      password: string | undefined
      output: string
      force: boolean
      link: string
    }

export const USAGE = `FilePizza command line client: send and receive files peer to peer.

Usage:
  filepizza send [options] <file or folder>...
  filepizza receive [options] <link>

Send options:
  -s, --server <url>     FilePizza server to use (default: ${DEFAULT_SERVER})
  -p, --password <text>  Ask downloaders for this password
      --once             Exit after one download has finished

Receive options:
  -o, --output <folder>  Where to save the files (default: the current folder)
  -p, --password <text>  Password for the transfer, if it has one
  -s, --server <url>     Server for a bare code (a full link names its own)
  -f, --force            Overwrite files that already exist

Other:
  -h, --help             Show this help
  -v, --version          Show the version

Environment: FILEPIZZA_SERVER and FILEPIZZA_PASSWORD set the defaults for
--server and --password. Prefer the variable for passwords: command line
arguments can be seen by other users of the machine.

Examples:
  filepizza send photo.jpg notes/
  filepizza receive https://file.pizza/download/abcd1234
  filepizza receive --output ~/Downloads abcd1234
`

type Env = Record<string, string | undefined>

function normalizeServer(server: string): string {
  let url: URL
  try {
    url = new URL(server)
  } catch {
    throw new UsageError(`"${server}" is not a valid server URL.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UsageError(`The server must be an http or https URL: "${server}"`)
  }
  return url.origin
}

export function parseCommand(argv: string[], env: Env = {}): Command {
  const [name, ...rest] = argv
  if (
    name === undefined ||
    name === 'help' ||
    name === '-h' ||
    name === '--help'
  ) {
    return { kind: 'help' }
  }
  if (name === 'version' || name === '-v' || name === '--version') {
    return { kind: 'version' }
  }
  if (name !== 'send' && name !== 'receive') {
    throw new UsageError(`Unknown command "${name}". Try "filepizza --help".`)
  }

  let parsed: ReturnType<typeof readOptions>
  try {
    parsed = readOptions(rest)
  } catch (error) {
    throw new UsageError((error as Error).message)
  }
  const { values, positionals } = parsed

  if (values.help) return { kind: 'help' }

  const serverGiven = (values.server ?? env.FILEPIZZA_SERVER) !== undefined
  const server = normalizeServer(
    values.server ?? env.FILEPIZZA_SERVER ?? DEFAULT_SERVER,
  )
  const password = values.password ?? env.FILEPIZZA_PASSWORD

  if (name === 'send') {
    if (values.output !== undefined || values.force) {
      throw new UsageError('--output and --force only apply to "receive".')
    }
    if (positionals.length === 0) {
      throw new UsageError('Give at least one file or folder to send.')
    }
    return {
      kind: 'send',
      server,
      password: password || undefined,
      once: values.once ?? false,
      paths: positionals,
    }
  }

  if (values.once) {
    throw new UsageError('--once only applies to "send".')
  }
  if (positionals.length !== 1) {
    throw new UsageError('Give exactly one download link or code to receive.')
  }
  return {
    kind: 'receive',
    server,
    serverGiven,
    password: password || undefined,
    output: values.output ?? '.',
    force: values.force ?? false,
    link: positionals[0],
  }
}

function readOptions(args: string[]) {
  return parseArgs({
    args,
    allowPositionals: true,
    options: {
      server: { type: 'string', short: 's' },
      password: { type: 'string', short: 'p' },
      once: { type: 'boolean' },
      output: { type: 'string', short: 'o' },
      force: { type: 'boolean', short: 'f' },
      help: { type: 'boolean', short: 'h' },
    },
  })
}
