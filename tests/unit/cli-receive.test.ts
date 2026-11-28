// @vitest-environment node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '../../src/messages'
import { receiveFiles } from '../../cli/receive'
import type { ReceiveEvent, ReceiveOptions } from '../../cli/receive'

class FakeConnection {
  open: boolean
  closed = false
  sent: Message[] = []
  private readonly handlers = {
    open: new Set<() => void>(),
    close: new Set<() => void>(),
    data: new Set<(data: unknown) => void>(),
    error: new Set<(error: Error) => void>(),
  }

  constructor(open = true) {
    this.open = open
  }

  send(message: Message) {
    this.sent.push(message)
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.open = false
    this.handlers.close.forEach((handler) => handler())
  }

  on(event: 'open' | 'close' | 'data' | 'error', handler: never) {
    this.handlers[event].add(handler)
  }

  emit(message: object) {
    this.handlers.data.forEach((handler) => handler(message))
  }

  fail(error: Error) {
    this.handlers.error.forEach((handler) => handler(error))
  }

  connected() {
    this.open = true
    this.handlers.open.forEach((handler) => handler())
  }

  ofType(type: string) {
    return this.sent.filter((message) => message.type === type)
  }
}

const CLIENT = {
  name: 'FilePizza CLI',
  version: '1.2.3',
  osName: 'linux',
  osVersion: '6',
}
const info = (...files: Array<[string, number]>) => ({
  type: 'Info',
  files: files.map(([fileName, size]) => ({ fileName, size, type: 'x' })),
})
const chunk = (
  fileName: string,
  offset: number,
  text: string,
  final: boolean,
) => ({
  type: 'Chunk',
  fileName,
  offset,
  bytes: new TextEncoder().encode(text),
  final,
})

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'filepizza-receive-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function start(
  options: Partial<ReceiveOptions> = {},
  conn = new FakeConnection(),
) {
  const events: ReceiveEvent[] = []
  const result = receiveFiles(conn, {
    output: dir,
    force: false,
    client: CLIENT,
    report: (event) => events.push(event),
    ...options,
  })
  // Don't let a rejection that the test handles later count as unhandled.
  result.catch(() => {})
  return { conn, events, result }
}

const waitFor = (check: () => void) => vi.waitFor(check, { timeout: 2000 })

describe('receiving files', () => {
  it('asks what is on offer, then fetches each file in turn and saves it', async () => {
    const { conn, events, result } = start()
    expect(conn.sent).toEqual([
      {
        type: 'RequestInfo',
        browserName: 'FilePizza CLI',
        browserVersion: '1.2.3',
        osName: 'linux',
        osVersion: '6',
        mobileVendor: '',
        mobileModel: '',
      },
    ])

    conn.emit(info(['top.txt', 5], ['album/inner.txt', 3], ['empty.txt', 0]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    expect(conn.ofType('Start')[0]).toEqual({
      type: 'Start',
      fileName: 'top.txt',
      offset: 0,
    })

    conn.emit(chunk('top.txt', 0, 'hello', true))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(2))
    expect(conn.ofType('ChunkAck')[0]).toEqual({
      type: 'ChunkAck',
      fileName: 'top.txt',
      offset: 0,
      bytesReceived: 5,
    })

    // Chunks for a file that isn't the current one are ignored.
    conn.emit(chunk('empty.txt', 0, '', true))
    conn.emit(chunk('album/inner.txt', 0, 'abc', true))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(3))
    conn.emit(chunk('empty.txt', 0, '', true))

    const written = await result
    expect(written).toEqual([
      join(dir, 'top.txt'),
      join(dir, 'album', 'inner.txt'),
      join(dir, 'empty.txt'),
    ])
    expect(readFileSync(join(dir, 'top.txt'), 'utf8')).toBe('hello')
    expect(readFileSync(join(dir, 'album', 'inner.txt'), 'utf8')).toBe('abc')
    expect(readFileSync(join(dir, 'empty.txt'), 'utf8')).toBe('')
    expect(conn.ofType('Done')).toHaveLength(1)
    expect(conn.closed).toBe(true)

    expect(events[0]).toEqual({
      type: 'files',
      files: [
        { fileName: 'top.txt', size: 5 },
        { fileName: 'album/inner.txt', size: 3 },
        { fileName: 'empty.txt', size: 0 },
      ],
    })
    expect(events).toContainEqual({
      type: 'progress',
      fileName: 'top.txt',
      fileIndex: 1,
      fileCount: 3,
      bytes: 5,
      size: 5,
      totalBytes: 5,
      totalSize: 8,
    })
    expect(events.filter((event) => event.type === 'file-done')).toHaveLength(3)
  })

  it('reassembles a file from several chunks, even when they arrive out of order', async () => {
    const { conn, result } = start()
    conn.emit(info(['f.txt', 6]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('f.txt', 4, 'ef', true))
    conn.emit(chunk('f.txt', 0, 'abcd', false))
    await result
    expect(readFileSync(join(dir, 'f.txt'), 'utf8')).toBe('abcdef')
    expect(
      conn.ofType('ChunkAck').map((ack) => (ack as { offset: number }).offset),
    ).toEqual([0, 4])
  })

  it('waits for the connection to open before asking, and needs no report callback', async () => {
    const conn = new FakeConnection(false)
    const result = receiveFiles(conn, {
      output: dir,
      force: false,
      client: CLIENT,
    })
    expect(conn.sent).toEqual([])
    conn.connected()
    expect(conn.sent).toHaveLength(1)

    conn.emit(info(['f.txt', 1]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('f.txt', 0, 'x', true))
    await result
    // A late close after finishing changes nothing.
    conn.close()
  })
})

describe('passwords', () => {
  it('sends the password when asked', async () => {
    const { conn, result } = start({ password: 'extra-cheese' })
    conn.emit({ type: 'PasswordRequired' })
    expect(conn.sent.at(-1)).toEqual({
      type: 'UsePassword',
      password: 'extra-cheese',
    })
    conn.emit(info(['f.txt', 1]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('f.txt', 0, 'x', true))
    await result
  })

  it('fails when a password is needed but not given, or not accepted', async () => {
    const none = start()
    none.conn.emit({ type: 'PasswordRequired' })
    await expect(none.result).rejects.toThrow(/needs a password/)

    const wrong = start({ password: 'nope' })
    wrong.conn.emit({
      type: 'PasswordRequired',
      errorMessage: 'Invalid password',
    })
    await expect(wrong.result).rejects.toThrow(/password was not accepted/)
  })
})

describe('refusing to save', () => {
  it('refuses names that could write outside the folder', async () => {
    for (const name of ['../escape.txt', 'a/../../b', 'C:\\x']) {
      const { conn, result } = start()
      conn.emit(info([name, 1]))
      await expect(result).rejects.toThrow(/unsafe name/)
      expect(conn.ofType('Start')).toHaveLength(0)
    }
  })

  it('treats an absolute-looking name as relative to the folder', async () => {
    const { conn, result } = start()
    conn.emit(info(['/etc/passwd', 1]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('/etc/passwd', 0, 'x', true))
    expect(await result).toEqual([join(dir, 'etc', 'passwd')])
  })

  it('refuses two names that would end up in the same file', async () => {
    const { conn, result } = start()
    conn.emit(info(['a.txt', 1], ['./a.txt', 1]))
    await expect(result).rejects.toThrow(/Cannot save/)
  })

  it('refuses to overwrite a file unless told to', async () => {
    writeFileSync(join(dir, 'keep.txt'), 'original')
    const refused = start()
    refused.conn.emit(info(['keep.txt', 1]))
    await expect(refused.result).rejects.toThrow(/already exists.*--force/)
    expect(readFileSync(join(dir, 'keep.txt'), 'utf8')).toBe('original')

    const forced = start({ force: true })
    forced.conn.emit(info(['keep.txt', 3]))
    await waitFor(() => expect(forced.conn.ofType('Start')).toHaveLength(1))
    forced.conn.emit(chunk('keep.txt', 0, 'new', true))
    await forced.result
    expect(readFileSync(join(dir, 'keep.txt'), 'utf8')).toBe('new')
  })

  it('refuses an offer of nothing', async () => {
    const { conn, result } = start()
    conn.emit(info())
    await expect(result).rejects.toThrow(/not sharing any files/)
  })

  it('stops when the destination cannot be written', async () => {
    writeFileSync(join(dir, 'blocker'), 'a file where a folder is needed')
    const { conn, result } = start()
    conn.emit(info(['blocker/inner.txt', 1]))
    await expect(result).rejects.toThrow()
  })
})

describe('when the transfer goes wrong', () => {
  it('stops on an error or a report from the sender', async () => {
    const error = start()
    error.conn.emit({ type: 'Error', error: 'disk full' })
    await expect(error.result).rejects.toThrow(
      /sender reported an error: disk full/,
    )

    const reported = start()
    reported.conn.emit({ type: 'Report' })
    await expect(reported.result).rejects.toThrow(/reported/)
  })

  it('stops when the connection fails or closes early', async () => {
    const failing = start()
    failing.conn.fail(new Error('ICE failed'))
    await expect(failing.result).rejects.toThrow('ICE failed')

    const closing = start()
    closing.conn.close()
    await expect(closing.result).rejects.toThrow(
      /disconnected before the transfer finished/,
    )
  })

  it('stops on a message it cannot read or a chunk that does not fit', async () => {
    const garbage = start()
    garbage.conn.emit({ type: 'Nonsense' })
    await expect(garbage.result).rejects.toThrow()

    const badRange = start()
    badRange.conn.emit(info(['f.txt', 2]))
    await waitFor(() => expect(badRange.conn.ofType('Start')).toHaveLength(1))
    badRange.conn.emit(chunk('f.txt', 0, 'toolong', true))
    await expect(badRange.result).rejects.toThrow(/Invalid chunk/)
  })

  it('removes a file that was only partly received', async () => {
    const { conn, result } = start()
    conn.emit(info(['big.txt', 10]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('big.txt', 0, 'abc', false))
    await waitFor(() => expect(conn.ofType('ChunkAck')).toHaveLength(1))
    expect(existsSync(join(dir, 'big.txt'))).toBe(true)

    conn.close()
    await expect(result).rejects.toThrow(/disconnected/)
    expect(existsSync(join(dir, 'big.txt'))).toBe(false)
  })

  it('still reports the failure if the partial file is already gone', async () => {
    const { conn, result } = start()
    conn.emit(info(['big.txt', 10]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('big.txt', 0, 'abc', false))
    await waitFor(() => expect(conn.ofType('ChunkAck')).toHaveLength(1))

    rmSync(join(dir, 'big.txt'))
    conn.close()
    await expect(result).rejects.toThrow(/disconnected/)
  })

  it('keeps files that were already complete', async () => {
    const { conn, result } = start()
    conn.emit(info(['done.txt', 1], ['partial.txt', 5]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('done.txt', 0, 'x', true))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(2))
    conn.close()
    await expect(result).rejects.toThrow()
    expect(readFileSync(join(dir, 'done.txt'), 'utf8')).toBe('x')
    expect(existsSync(join(dir, 'partial.txt'))).toBe(false)
  })

  it('does not choke on a folder that already exists for a nested file', async () => {
    mkdirSync(join(dir, 'album'))
    const { conn, result } = start()
    conn.emit(info(['album/a.txt', 1]))
    await waitFor(() => expect(conn.ofType('Start')).toHaveLength(1))
    conn.emit(chunk('album/a.txt', 0, 'x', true))
    await result
  })
})
