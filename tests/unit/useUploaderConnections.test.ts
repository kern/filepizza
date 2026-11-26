import { EventEmitter } from 'node:events'
import { act, cleanup, renderHook } from '@testing-library/react'
import type Peer from 'peerjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_CHUNK_SIZE,
  useUploaderConnections,
} from '../../src/hooks/useUploaderConnections'
import { type Message, MessageType } from '../../src/messages'
import { UploaderConnectionStatus } from '../../src/types'

class TestConnection extends EventEmitter {
  open = true
  send = vi.fn<(message: Message) => void>()

  close() {
    this.open = false
    this.emit('close')
  }
}

const fileName = 'large.bin'
const fileSize = 2 * MAX_CHUNK_SIZE + 13

function setupTransfer(...files: File[]) {
  const peer = new EventEmitter()
  const connection = new TestConnection()
  const { result } = renderHook(() =>
    useUploaderConnections(peer as unknown as Peer, files, ''),
  )

  act(() => {
    peer.emit('connection', connection)
  })

  const receive = (message: Message) => {
    act(() => {
      connection.emit('data', message)
    })
  }
  receive({
    type: MessageType.RequestInfo,
    browserName: '',
    browserVersion: '',
    osName: '',
    osVersion: '',
    mobileVendor: '',
    mobileModel: '',
  })

  return {
    state: () => result.current[0],
    chunks: () =>
      connection.send.mock.calls
        .map(([message]) => message)
        .filter((message) => message.type === MessageType.Chunk),
    start: (fileName: string, offset = 0) =>
      receive({ type: MessageType.Start, fileName, offset }),
    acknowledge: (fileName: string, offset: number, bytesReceived: number) =>
      receive({ type: MessageType.ChunkAck, fileName, offset, bytesReceived }),
    receive,
  }
}

function largeFile() {
  return new File([new Uint8Array(fileSize)], fileName)
}

describe('useUploaderConnections transfer progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('waits for receiver acknowledgments even after queuing the final chunk', () => {
    const transfer = setupTransfer(largeFile())
    transfer.start(fileName)
    for (let chunk = 0; chunk < 3; chunk++) {
      act(() => vi.advanceTimersToNextTimer())
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

  it('ignores acknowledgments for unsent chunks, other files, and invalid byte ranges', () => {
    const transfer = setupTransfer(largeFile(), new File([], 'other.bin'))
    transfer.start(fileName)
    transfer.acknowledge(fileName, 0, MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(0)

    act(() => vi.runAllTimers())
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

  it('starts each file with fresh progress and waits for an empty file acknowledgment', () => {
    const transfer = setupTransfer(
      new File(['a'], 'first.txt'),
      new File([], 'empty.txt'),
    )
    transfer.start('first.txt')
    act(() => vi.runAllTimers())
    transfer.acknowledge('first.txt', 0, 1)

    transfer.start('empty.txt')
    act(() => vi.runAllTimers())
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

  it('rejects start offsets outside the file or between bytes', () => {
    const transfer = setupTransfer(largeFile())
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      for (const offset of [-1, 0.5, fileSize + 1]) {
        transfer.start(fileName, offset)
      }
    } finally {
      logError.mockRestore()
    }

    act(() => vi.runAllTimers())
    expect(transfer.chunks()).toHaveLength(0)
    expect(transfer.state().status).toBe(UploaderConnectionStatus.Ready)
  })

  it('starts resumed progress at the requested byte offset', () => {
    const transfer = setupTransfer(largeFile())
    transfer.start(fileName)
    transfer.receive({ type: MessageType.Pause })
    act(() => vi.runAllTimers())
    expect(transfer.chunks()).toHaveLength(0)

    transfer.start(fileName, 2 * MAX_CHUNK_SIZE)
    expect(transfer.state().currentFileProgress).toBe(
      (2 * MAX_CHUNK_SIZE) / fileSize,
    )
    act(() => vi.runAllTimers())
    expect(transfer.chunks()).toHaveLength(1)
    expect(transfer.chunks()[0]).toMatchObject({
      offset: 2 * MAX_CHUNK_SIZE,
      final: true,
    })
    transfer.acknowledge(fileName, 2 * MAX_CHUNK_SIZE, 13)
    expect(transfer.state().completedFiles).toBe(1)
  })
})
