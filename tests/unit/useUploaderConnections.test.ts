import { EventEmitter } from 'node:events'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_CHUNK_SIZE,
  useUploaderConnections,
} from '../../src/hooks/useUploaderConnections'
import { type Message, MessageType } from '../../src/messages'
import {
  UploaderConnectionStatus,
  type UploaderTransport,
} from '../../src/types'

class TestConnection
  extends EventEmitter<{ data: [unknown]; close: [] }>
  implements UploaderTransport
{
  readonly peer = 'test-downloader'
  open = true
  readonly messages: Message[] = []

  constructor(readonly metadata?: { type?: string }) {
    super()
  }

  send(message: Message) {
    this.messages.push(message)
  }

  close() {
    this.open = false
    this.emit('close')
  }
}

const fileName = 'large.bin'
const fileSize = 2 * MAX_CHUNK_SIZE + 13

const requestInfo: Message = {
  type: MessageType.RequestInfo,
  browserName: 'Test browser',
  browserVersion: '1',
  osName: '',
  osVersion: '',
  mobileVendor: '',
  mobileModel: '',
}

// A File whose slices can be read in jsdom, which lacks Blob.arrayBuffer().
// `read` runs before each slice resolves, so tests can delay or fail a read.
function testFile(
  content: string | Uint8Array,
  name: string,
  {
    type = '',
    read = async () => {},
  }: { type?: string; read?: (start: number) => Promise<void> } = {},
): File {
  const bytes = new Uint8Array(
    typeof content === 'string' ? new TextEncoder().encode(content) : content,
  )
  const file = new File([bytes], name, { type })
  file.slice = (start = 0, end = bytes.byteLength) => {
    const blob = new Blob()
    blob.arrayBuffer = async () => {
      await read(start)
      return bytes.slice(start, end).buffer
    }
    return blob
  }
  return file
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setupTransfer(files: File[], password = '') {
  const peer = new EventEmitter<{ connection: [UploaderTransport] }>()
  const location = { href: '/' }
  const logger = { log: vi.fn(), error: vi.fn() }
  const { result } = renderHook(
    () => useUploaderConnections(peer, files, password, { logger, location }),
    { reactStrictMode: true },
  )

  const connect = (connection: TestConnection) => {
    act(() => {
      peer.emit('connection', connection)
    })
  }

  const connection = new TestConnection()
  connect(connection)

  const receive = (message: unknown) => {
    act(() => {
      connection.emit('data', message)
    })
  }
  receive(requestInfo)

  return {
    connection,
    connect,
    location,
    logger,
    state: () =>
      result.current.find((entry) => entry.dataConnection === connection)!,
    chunks: () =>
      connection.messages.filter(
        (message) => message.type === MessageType.Chunk,
      ),
    start: (fileName: string, offset = 0) =>
      receive({ type: MessageType.Start, fileName, offset }),
    acknowledge: (fileName: string, offset: number, bytesReceived: number) =>
      receive({ type: MessageType.ChunkAck, fileName, offset, bytesReceived }),
    receive,
    // Reading a slice is asynchronous, so timers have to be run with await.
    sendNextChunk: () => act(() => vi.advanceTimersToNextTimerAsync()),
    sendChunks: () => act(() => vi.runAllTimersAsync()),
  }
}

function largeFile(read?: (start: number) => Promise<void>) {
  return testFile(new Uint8Array(fileSize), fileName, { read })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useUploaderConnections transfer progress', () => {
  it('waits for receiver acknowledgments even after queuing the final chunk', async () => {
    const transfer = setupTransfer([largeFile()])
    transfer.start(fileName)
    for (let chunk = 0; chunk < 3; chunk++) {
      await transfer.sendNextChunk()
    }

    expect(
      transfer.chunks().map(({ offset, final }) => ({ offset, final })),
    ).toEqual([
      { offset: 0, final: false },
      { offset: MAX_CHUNK_SIZE, final: false },
      { offset: 2 * MAX_CHUNK_SIZE, final: true },
    ])
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Uploading,
      currentFileProgress: 0,
      completedFiles: 0,
    })

    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE)
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Uploading,
      currentFileProgress: MAX_CHUNK_SIZE / fileSize,
      completedFiles: 0,
    })

    transfer.acknowledge(fileName, MAX_CHUNK_SIZE, MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(
      (2 * MAX_CHUNK_SIZE) / fileSize,
    )
    transfer.acknowledge(fileName, 2 * MAX_CHUNK_SIZE, 13)
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Ready,
      completedFiles: 1,
    })

    transfer.receive({ type: MessageType.Done })
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Done)
  })

  it('ignores acknowledgments for unsent chunks, other files, and invalid byte ranges', async () => {
    const transfer = setupTransfer([largeFile(), testFile('', 'other.bin')])
    transfer.start(fileName)
    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(0)

    await transfer.sendChunks()
    transfer.acknowledge('other.bin', 0, 0)
    transfer.acknowledge('unknown.bin', 0, MAX_CHUNK_SIZE)
    transfer.acknowledge(fileName, MAX_CHUNK_SIZE, MAX_CHUNK_SIZE)
    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE - 1)
    expect(transfer.state().currentFileProgress).toBe(0)

    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE)
    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(MAX_CHUNK_SIZE / fileSize)
    expect(transfer.state().completedFiles).toBe(0)
  })

  it('starts each file with fresh progress and waits for an empty file acknowledgment', async () => {
    const transfer = setupTransfer([
      testFile('a', 'first.txt'),
      testFile('', 'empty.txt'),
    ])
    transfer.start('first.txt')
    await transfer.sendChunks()
    transfer.acknowledge('first.txt', 0, 1)

    transfer.start('empty.txt')
    await transfer.sendChunks()
    expect(transfer.chunks().at(-1)).toMatchObject({
      fileName: 'empty.txt',
      offset: 0,
      final: true,
    })
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Uploading,
      acknowledgedBytes: 0,
      currentFileProgress: 0,
      completedFiles: 1,
    })

    transfer.acknowledge('first.txt', 0, 1)
    expect(transfer.state().completedFiles).toBe(1)
    transfer.acknowledge('empty.txt', 0, 0)
    transfer.acknowledge('empty.txt', 0, 0)
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Ready,
      currentFileProgress: 0,
      completedFiles: 2,
    })
  })

  it('rejects start offsets outside the file or between bytes', async () => {
    const transfer = setupTransfer([largeFile()])
    for (const offset of [-1, 0.5, fileSize + 1]) {
      transfer.start(fileName, offset)
    }
    expect(transfer.logger.error).toHaveBeenCalledTimes(3)

    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(0)
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)
  })

  it('starts resumed progress at the requested byte offset', async () => {
    const transfer = setupTransfer([largeFile()])
    transfer.start(fileName)
    transfer.receive({ type: MessageType.Pause })
    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(0)

    transfer.start(fileName, 2 * MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(
      (2 * MAX_CHUNK_SIZE) / fileSize,
    )
    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(1)
    expect(transfer.chunks()[0]).toMatchObject({
      offset: 2 * MAX_CHUNK_SIZE,
      final: true,
    })
    transfer.acknowledge(fileName, 2 * MAX_CHUNK_SIZE, 13)
    expect(transfer.state().completedFiles).toBe(1)
  })
})

describe('useUploaderConnections connection lifecycle', () => {
  it('accepts the default browser dependencies', () => {
    const peer = new EventEmitter<{ connection: [UploaderTransport] }>()
    const files: File[] = []
    const { result } = renderHook(() => useUploaderConnections(peer, files, ''))
    expect(result.current).toEqual([])
  })

  it('provides file information and records the downloader details', () => {
    const transfer = setupTransfer([
      testFile('a', 'first.txt', { type: 'text/plain' }),
    ])
    expect(transfer.connection.messages).toEqual([
      {
        type: MessageType.Info,
        files: [{ fileName: 'first.txt', size: 1, type: 'text/plain' }],
      },
    ])
    transfer.receive({
      ...requestInfo,
      browserName: 'Other browser',
      mobileVendor: 'Test',
      mobileModel: 'Phone',
    })
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Ready,
      browserName: 'Test browser',
    })

    transfer.receive({ type: MessageType.UsePassword, password: '' })
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)
  })

  it('handles rejected passwords and allows a correct retry', async () => {
    const transfer = setupTransfer([largeFile()], 'secret')
    expect(transfer.state().status).toBe(
      UploaderConnectionStatus.Authenticating,
    )
    expect(transfer.connection.messages).toEqual([
      { type: MessageType.PasswordRequired },
    ])

    transfer.receive(requestInfo)
    transfer.start(fileName)
    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(0)

    transfer.receive({ type: MessageType.UsePassword, password: 'wrong' })
    transfer.receive({ type: MessageType.UsePassword, password: 'still wrong' })
    expect(transfer.state().status).toBe(
      UploaderConnectionStatus.InvalidPassword,
    )
    expect(transfer.connection.messages.at(-1)).toEqual({
      type: MessageType.PasswordRequired,
      errorMessage: 'Invalid password',
    })

    transfer.receive({ type: MessageType.UsePassword, password: 'secret' })
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)
    expect(transfer.connection.messages.at(-1)).toEqual({
      type: MessageType.Info,
      files: [{ fileName, size: fileSize, type: '' }],
    })
  })

  it('also accepts the correct password on the first attempt', () => {
    const transfer = setupTransfer([largeFile()], 'secret')
    transfer.receive({ type: MessageType.UsePassword, password: 'secret' })
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)
  })

  it('preserves a rejected password status after disconnecting', () => {
    const transfer = setupTransfer([largeFile()], 'secret')
    transfer.receive({ type: MessageType.UsePassword, password: 'wrong' })
    act(() => transfer.connection.close())
    expect(transfer.state().status).toBe(
      UploaderConnectionStatus.InvalidPassword,
    )
  })

  it('lets a new connection close while a send is scheduled', async () => {
    const transfer = setupTransfer([largeFile()])
    transfer.start(fileName)
    act(() => transfer.connection.close())
    await transfer.sendChunks()
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Closed)
    expect(transfer.chunks()).toHaveLength(0)
  })

  it('stops sending if the transport is already closed when the timer fires', async () => {
    const transfer = setupTransfer([largeFile()])
    transfer.start(fileName)
    transfer.connection.open = false
    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(0)
  })

  it('ignores early Done and allows pausing after the last chunk is queued', async () => {
    const transfer = setupTransfer([testFile('a', 'first.txt')])
    transfer.receive({ type: MessageType.Pause })
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)

    transfer.start('first.txt')
    transfer.receive({ type: MessageType.Done })
    expect(transfer.connection.open).toBe(true)
    await transfer.sendChunks()
    expect(transfer.chunks()).toHaveLength(1)

    transfer.receive({ type: MessageType.Pause })
    transfer.acknowledge('first.txt', 0, 1)
    expect(transfer.state()).toMatchObject({
      status: UploaderConnectionStatus.Paused,
      completedFiles: 0,
    })
  })

  it('forwards a report to active peers and redirects the uploader', () => {
    const transfer = setupTransfer([largeFile()])
    const other = new TestConnection()
    const disconnected = new TestConnection()
    transfer.connect(other)
    transfer.connect(disconnected)
    act(() => disconnected.close())
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)

    const reporter = new TestConnection({ type: 'report' })
    transfer.connect(reporter)

    expect(transfer.location.href).toBe('/reported')
    for (const connection of [transfer.connection, other]) {
      expect(connection.messages.at(-1)).toEqual({ type: MessageType.Report })
      expect(connection.open).toBe(false)
    }
    expect(disconnected.messages).toEqual([])
    expect(reporter.messages).toEqual([])
  })
})

describe('useUploaderConnections chunk reads', () => {
  it('sends ArrayBuffers in offset order when an earlier read is slower', async () => {
    const content = new Uint8Array(fileSize).map(
      (_, i) => (i * 31 + (i >> 18)) & 0xff,
    )
    const file = testFile(content, fileName, {
      read: (start) =>
        new Promise((resolve) => setTimeout(resolve, start === 0 ? 25 : 0)),
    })
    const transfer = setupTransfer([file])
    transfer.start(fileName)
    await transfer.sendChunks()

    const chunks = transfer.chunks()
    expect(chunks.map((chunk) => chunk.offset)).toEqual([
      0,
      MAX_CHUNK_SIZE,
      2 * MAX_CHUNK_SIZE,
    ])
    const sent = new Uint8Array(fileSize)
    for (const chunk of chunks) {
      // A Blob here would make PeerJS pack the message asynchronously.
      expect(chunk.bytes).toBeInstanceOf(ArrayBuffer)
      sent.set(new Uint8Array(chunk.bytes as ArrayBuffer), chunk.offset)
    }
    expect(Buffer.from(sent).equals(Buffer.from(content))).toBe(true)
  })

  it('drops an in-flight read when paused, then resumes from the requested offset', async () => {
    const firstRead = deferred()
    const read = vi.fn((start: number) =>
      start === 0 ? firstRead.promise : Promise.resolve(),
    )
    const transfer = setupTransfer([largeFile(read)])
    transfer.start(fileName)
    await transfer.sendNextChunk()
    expect(read).toHaveBeenCalledTimes(1)

    transfer.receive({ type: MessageType.Pause })
    transfer.start(fileName, 2 * MAX_CHUNK_SIZE)
    await act(async () => firstRead.resolve())
    await transfer.sendChunks()

    expect(transfer.chunks().map((chunk) => chunk.offset)).toEqual([
      2 * MAX_CHUNK_SIZE,
    ])
  })

  it('does not send a chunk whose read finishes after the connection closes', async () => {
    const firstRead = deferred()
    const read = vi.fn(() => firstRead.promise)
    const transfer = setupTransfer([largeFile(read)])
    transfer.start(fileName)
    await transfer.sendNextChunk()
    act(() => transfer.connection.close())
    await act(async () => firstRead.resolve())
    await transfer.sendChunks()

    expect(read).toHaveBeenCalledTimes(1)
    expect(transfer.chunks()).toHaveLength(0)
  })

  it('does not send if the transport closes during a read', async () => {
    const firstRead = deferred()
    const transfer = setupTransfer([largeFile(() => firstRead.promise)])
    transfer.start(fileName)
    await transfer.sendNextChunk()
    transfer.connection.open = false
    await act(async () => firstRead.resolve())
    await transfer.sendChunks()

    expect(transfer.chunks()).toHaveLength(0)
  })

  it('tells the downloader when the file cannot be read', async () => {
    const transfer = setupTransfer([
      largeFile(() => Promise.reject(new Error('NotReadableError'))),
    ])
    transfer.start(fileName)
    await transfer.sendChunks()

    expect(transfer.chunks()).toHaveLength(0)
    expect(transfer.connection.messages.at(-1)).toEqual({
      type: MessageType.Error,
      error: expect.stringContaining(`could not read ${fileName}`),
    })
    expect(transfer.logger.error).toHaveBeenCalled()
  })

  it('stays quiet when a read fails after the transfer was paused', async () => {
    const firstRead = deferred()
    const transfer = setupTransfer([largeFile(() => firstRead.promise)])
    transfer.start(fileName)
    await transfer.sendNextChunk()
    transfer.receive({ type: MessageType.Pause })
    await act(async () => firstRead.reject(new Error('NotReadableError')))

    expect(transfer.connection.messages.at(-1)?.type).toBe(MessageType.Info)
    expect(transfer.logger.error).not.toHaveBeenCalled()
  })
})
