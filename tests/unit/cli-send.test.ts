// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Message } from '../../src/messages'
import type { UploaderTransport } from '../../src/types'
import type { SendFile } from '../../cli/paths'
import {
  IN_FLIGHT_BYTES,
  MAX_CHUNK_SIZE,
  isFinalChunk,
  readChunkFromDisk,
  serveFiles,
} from '../../cli/send'
import type { SendEvent } from '../../cli/send'

class FakeConnection {
  open = true
  closed = false
  sent: Message[] = []
  private readonly handlers = {
    data: new Set<(data: unknown) => void>(),
    close: new Set<() => void>(),
  }

  constructor(
    readonly peer = 'peer-1234567890',
    readonly metadata?: { type?: string },
  ) {}

  send(message: Message) {
    this.sent.push(message)
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.open = false
    this.handlers.close.forEach((handler) => handler())
  }

  on(event: 'data' | 'close', handler: never) {
    this.handlers[event].add(handler)
  }

  off(event: 'data' | 'close', handler: never) {
    this.handlers[event].delete(handler)
  }

  emit(message: object) {
    this.handlers.data.forEach((handler) => handler(message))
  }

  chunks() {
    return this.sent.filter(
      (message): message is Extract<Message, { type: 'Chunk' }> =>
        message.type === 'Chunk',
    )
  }
}

class FakePeer {
  private readonly listeners = new Set<(conn: UploaderTransport) => void>()
  on(_event: 'connection', listener: (conn: UploaderTransport) => void) {
    this.listeners.add(listener)
  }
  off(_event: 'connection', listener: (conn: UploaderTransport) => void) {
    this.listeners.delete(listener)
  }
  connect(conn: FakeConnection) {
    this.listeners.forEach((listener) =>
      listener(conn as unknown as UploaderTransport),
    )
  }
  get listening() {
    return this.listeners.size
  }
}

const REQUEST_INFO = {
  type: 'RequestInfo',
  browserName: 'Firefox',
  browserVersion: '130',
  osName: 'Linux',
  osVersion: '6',
  mobileVendor: '',
  mobileModel: '',
}

const FILES: SendFile[] = [
  {
    path: '/a.bin',
    fileName: 'a.bin',
    size: 600_000,
    type: 'application/octet-stream',
  },
  { path: '/empty.txt', fileName: 'empty.txt', size: 0, type: 'text/plain' },
]

const ack = (fileName: string, offset: number, bytesReceived: number) => ({
  type: 'ChunkAck',
  fileName,
  offset,
  bytesReceived,
})

function setup(
  options: {
    password?: string
    files?: SendFile[]
    readChunk?: Parameters<typeof serveFiles>[2]['readChunk']
  } = {},
) {
  const peer = new FakePeer()
  const events: SendEvent[] = []
  const readChunk =
    options.readChunk ??
    vi.fn(
      async (_file: SendFile, _offset: number, length: number) =>
        new Uint8Array(length).fill(7).buffer,
    )
  const stop = serveFiles(peer, options.files ?? FILES, {
    password: options.password,
    report: (event) => events.push(event),
    readChunk,
  })
  const connect = (conn = new FakeConnection(), request = true) => {
    peer.connect(conn)
    if (request) conn.emit(REQUEST_INFO)
    return conn
  }
  return { peer, events, readChunk, stop, connect }
}

const types = (events: SendEvent[]) => events.map((event) => event.type)

describe('serving files', () => {
  it('tells a downloader what is on offer', () => {
    const { connect, events } = setup()
    const conn = connect()
    expect(conn.sent).toEqual([
      {
        type: 'Info',
        files: [
          {
            fileName: 'a.bin',
            size: 600_000,
            type: 'application/octet-stream',
          },
          { fileName: 'empty.txt', size: 0, type: 'text/plain' },
        ],
      },
    ])
    expect(events).toEqual([
      { type: 'connected', id: 'peer-1234567890' },
      {
        type: 'client',
        id: 'peer-1234567890',
        description: 'Firefox 130 on Linux 6',
      },
    ])
  })

  it('sends a file in order, ends it with a final chunk and counts it as done on the last ack', async () => {
    const { connect, events } = setup()
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(3))

    expect(conn.chunks().map((c) => [c.offset, c.final])).toEqual([
      [0, false],
      [MAX_CHUNK_SIZE, false],
      [2 * MAX_CHUNK_SIZE, true],
    ])
    expect(conn.chunks()[2].bytes).toHaveProperty(
      'byteLength',
      600_000 - 2 * MAX_CHUNK_SIZE,
    )

    conn.emit(ack('a.bin', 0, MAX_CHUNK_SIZE))
    conn.emit(ack('a.bin', MAX_CHUNK_SIZE, MAX_CHUNK_SIZE))
    conn.emit(ack('a.bin', 2 * MAX_CHUNK_SIZE, 600_000 - 2 * MAX_CHUNK_SIZE))
    expect(
      events
        .filter((e) => e.type === 'progress')
        .map((e) => e.type === 'progress' && e.bytes),
    ).toEqual([MAX_CHUNK_SIZE, 2 * MAX_CHUNK_SIZE, 600_000])
    expect(events.at(-1)).toEqual({
      type: 'file-done',
      id: 'peer-1234567890',
      fileName: 'a.bin',
    })

    // The next file can be requested; an empty one is a single empty final chunk.
    conn.emit({ type: 'Start', fileName: 'empty.txt', offset: 0 })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(4))
    expect(conn.chunks()[3]).toMatchObject({
      fileName: 'empty.txt',
      offset: 0,
      final: true,
    })
    conn.emit(ack('empty.txt', 0, 0))

    conn.emit({ type: 'Done' })
    expect(types(events).slice(-2)).toEqual(['file-done', 'done'])
    expect(conn.closed).toBe(true)
  })

  it('does not send more than the in-flight limit before acknowledgements arrive', async () => {
    const big: SendFile[] = [
      { path: '/big', fileName: 'big', size: 3 * IN_FLIGHT_BYTES, type: 'x' },
    ]
    const { connect } = setup({ files: big })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'big', offset: 0 })
    const window = IN_FLIGHT_BYTES / MAX_CHUNK_SIZE
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(window))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(conn.chunks()).toHaveLength(window)

    conn.emit(ack('big', 0, MAX_CHUNK_SIZE))
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(window + 1))
  })

  it('resumes from an offset and can be paused and started again', async () => {
    const { connect } = setup()
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: MAX_CHUNK_SIZE })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(2))
    expect(conn.chunks().map((c) => c.offset)).toEqual([
      MAX_CHUNK_SIZE,
      2 * MAX_CHUNK_SIZE,
    ])

    conn.emit({ type: 'Pause' })
    conn.emit({ type: 'Pause' }) // already paused: ignored
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 2 * MAX_CHUNK_SIZE })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(3))
    expect(conn.chunks()[2].offset).toBe(2 * MAX_CHUNK_SIZE)
  })
})

describe('passwords', () => {
  it('asks for one, refuses a wrong one and accepts the right one', () => {
    const { connect, events } = setup({ password: 'extra-cheese' })
    const conn = connect()
    expect(conn.sent).toEqual([{ type: 'PasswordRequired' }])

    // Asking for files before getting in does nothing.
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    expect(conn.chunks()).toEqual([])

    conn.emit({ type: 'UsePassword', password: 'nope' })
    expect(conn.sent.at(-1)).toEqual({
      type: 'PasswordRequired',
      errorMessage: 'Invalid password',
    })
    expect(events.at(-1)).toEqual({
      type: 'wrong-password',
      id: 'peer-1234567890',
    })

    conn.emit({ type: 'UsePassword', password: 'extra-cheese' })
    expect(conn.sent.at(-1)).toMatchObject({ type: 'Info' })

    // Once in, sending the password again does nothing.
    const sentBefore = conn.sent.length
    conn.emit({ type: 'UsePassword', password: 'extra-cheese' })
    expect(conn.sent).toHaveLength(sentBefore)
  })
})

describe('bad requests', () => {
  it('ignores requests for unknown files and invalid offsets, and keeps going', async () => {
    const { connect, events } = setup()
    const conn = connect()
    for (const request of [
      { fileName: 'nope', offset: 0 },
      { fileName: 'a.bin', offset: -1 },
      { fileName: 'a.bin', offset: 1.5 },
      { fileName: 'a.bin', offset: 600_001 },
    ]) {
      conn.emit({ type: 'Start', ...request })
    }
    expect(events.filter((e) => e.type === 'error')).toHaveLength(4)
    expect(conn.chunks()).toEqual([])

    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(3))
  })

  it('ignores acknowledgements that do not match what was sent', async () => {
    const { connect, events } = setup()
    const conn = connect()
    conn.emit(ack('a.bin', 0, MAX_CHUNK_SIZE)) // not uploading yet
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(3))

    conn.emit(ack('empty.txt', 0, 0)) // another file
    conn.emit(ack('a.bin', 5, MAX_CHUNK_SIZE)) // not the next offset
    conn.emit(ack('a.bin', 0, 100)) // wrong size
    conn.emit(ack('a.bin', 0, MAX_CHUNK_SIZE + 1)) // more than was sent
    expect(events.some((e) => e.type === 'progress')).toBe(false)

    conn.emit(ack('a.bin', 0, MAX_CHUNK_SIZE))
    expect(events.filter((e) => e.type === 'progress')).toHaveLength(1)
  })

  it('ignores Done before the files were finished, and messages it cannot read', () => {
    const { connect, events } = setup()
    const conn = connect(new FakeConnection(), false)
    conn.emit({ type: 'Done' })
    expect(conn.closed).toBe(false)

    conn.emit({ type: 'Nonsense' })
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      message: expect.stringContaining('could not be understood'),
    })
  })

  it('tells the downloader when a file cannot be read', async () => {
    const readChunk = vi.fn(async () => {
      throw new Error('EACCES')
    })
    const { connect, events } = setup({ readChunk })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() =>
      expect(conn.sent.at(-1)).toEqual({
        type: 'Error',
        error: 'The sender could not read a.bin. Was it moved or changed?',
      }),
    )
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      message: expect.stringContaining('EACCES'),
    })
  })
})

describe('connections ending', () => {
  it('reports a downloader that leaves, but not one that finished', () => {
    const { connect, events } = setup()
    const left = connect(new FakeConnection('left-peer'))
    left.close()
    expect(events.at(-1)).toEqual({ type: 'closed', id: 'left-peer' })

    const finished = connect(new FakeConnection('done-peer'))
    finished.emit({ type: 'Done' })
    expect(types(events).filter((type) => type === 'closed')).toHaveLength(1)
    expect(events.at(-1)).toEqual({ type: 'done', id: 'done-peer' })
  })

  it('stops sharing when a report arrives, telling everyone', () => {
    const { connect, events } = setup()
    const downloader = connect()
    const reporter = new FakeConnection('reporter', { type: 'report' })
    connect(reporter, false)
    expect(downloader.sent.at(-1)).toEqual({ type: 'Report' })
    expect(downloader.closed).toBe(true)
    expect(events.at(-1)).toEqual({ type: 'reported' })
    expect(
      events.some((e) => e.type === 'connected' && e.id === 'reporter'),
    ).toBe(false)
  })

  it('stops listening and closes everything when stopped', () => {
    const { peer, connect, stop } = setup()
    const conn = connect()
    expect(peer.listening).toBe(1)
    stop()
    expect(peer.listening).toBe(0)
    expect(conn.closed).toBe(true)
  })
})

describe('races while a chunk is being read', () => {
  // Reads that finish when the test says so.
  function controlledReads() {
    const pending: Array<(bytes: ArrayBuffer) => void> = []
    const readChunk = vi.fn(
      (_file: SendFile, _offset: number, length: number) =>
        new Promise<ArrayBuffer>((resolve) =>
          pending.push(() => resolve(new ArrayBuffer(length))),
        ),
    )
    return {
      readChunk,
      finish: (index: number) => pending[index](new ArrayBuffer(0)),
    }
  }

  it('does not send a chunk that was read for a transfer that was paused', async () => {
    const reads = controlledReads()
    const { connect } = setup({ readChunk: reads.readChunk })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(reads.readChunk).toHaveBeenCalledTimes(1))
    conn.emit({ type: 'Pause' })
    reads.finish(0)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(conn.chunks()).toEqual([])
  })

  it('lets a new request take over from a read that is still pending', async () => {
    const reads = controlledReads()
    const { connect } = setup({ readChunk: reads.readChunk })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(reads.readChunk).toHaveBeenCalledTimes(1))
    conn.emit({ type: 'Pause' })
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: MAX_CHUNK_SIZE })
    await vi.waitFor(() => expect(reads.readChunk).toHaveBeenCalledTimes(2))

    reads.finish(0) // the old read: dropped
    reads.finish(1)
    await vi.waitFor(() => expect(conn.chunks()).toHaveLength(1))
    expect(conn.chunks()[0].offset).toBe(MAX_CHUNK_SIZE)
  })

  it('does not start a second reader while one is running, and drops chunks for a closed connection', async () => {
    const reads = controlledReads()
    const { connect } = setup({ readChunk: reads.readChunk })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(reads.readChunk).toHaveBeenCalledTimes(1))
    reads.finish(0)
    await vi.waitFor(() => expect(reads.readChunk).toHaveBeenCalledTimes(2))

    // An ack arrives while the second chunk is being read.
    conn.emit(ack('a.bin', 0, MAX_CHUNK_SIZE))
    expect(reads.readChunk).toHaveBeenCalledTimes(2)

    // The connection goes away before that read finishes.
    conn.open = false
    reads.finish(1)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(conn.chunks()).toHaveLength(1)
  })

  it('stays quiet about a read error for a transfer that no longer matters', async () => {
    let fail!: (error: Error) => void
    const readChunk = vi.fn(
      () => new Promise<ArrayBuffer>((_, reject) => (fail = reject)),
    )
    const { connect } = setup({ readChunk })
    const conn = connect()
    conn.emit({ type: 'Start', fileName: 'a.bin', offset: 0 })
    await vi.waitFor(() => expect(readChunk).toHaveBeenCalled())
    conn.emit({ type: 'Pause' })
    fail(new Error('gone'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(conn.sent.some((message) => message.type === 'Error')).toBe(false)
  })
})

describe('chunk helpers', () => {
  it('knows which chunk is the last', () => {
    expect(isFinalChunk(0, 0)).toBe(true)
    expect(isFinalChunk(0, MAX_CHUNK_SIZE)).toBe(true)
    expect(isFinalChunk(0, MAX_CHUNK_SIZE + 1)).toBe(false)
    expect(isFinalChunk(MAX_CHUNK_SIZE, MAX_CHUNK_SIZE + 1)).toBe(true)
  })

  it('reads a slice of a file from disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'filepizza-read-'))
    try {
      const path = join(dir, 'f.txt')
      writeFileSync(path, 'abcdefghij')
      const file: SendFile = {
        path,
        fileName: 'f.txt',
        size: 10,
        type: 'text/plain',
      }
      expect(
        new TextDecoder().decode(await readChunkFromDisk(file, 3, 4)),
      ).toBe('defg')
      expect((await readChunkFromDisk(file, 0, 0)).byteLength).toBe(0)
      // The file got shorter than expected.
      await expect(readChunkFromDisk(file, 8, 5)).rejects.toThrow(/shorter/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
