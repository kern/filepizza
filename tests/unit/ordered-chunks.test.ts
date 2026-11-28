import { describe, it, expect, vi } from 'vitest'
import {
  OrderedChunkWriter,
  toUint8Array,
} from '../../src/utils/ordered-chunks'
import { MAX_CHUNK_SIZE } from '../../src/hooks/useUploaderConnections'

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

describe('toUint8Array', () => {
  it('normalizes ArrayBuffer and TypedArray inputs', () => {
    const src = new Uint8Array([1, 2, 3, 4])
    expect(toUint8Array(src)).toEqual(src)
    expect(toUint8Array(src.buffer)).toEqual(src)
    expect(toUint8Array(src.subarray(1, 3))).toEqual(new Uint8Array([2, 3]))
    expect(toUint8Array(new DataView(src.buffer, 1, 2))).toEqual(
      new Uint8Array([2, 3]),
    )
  })

  it('rejects payloads that are not binary', () => {
    expect(() => toUint8Array('abc')).toThrow('Unsupported chunk payload type')
  })
})

describe('OrderedChunkWriter', () => {
  it('reorders out-of-order 256 KiB chunks before enqueueing', () => {
    const received: Uint8Array[] = []
    const offsets: number[] = []
    const onComplete = vi.fn()
    const writer = new OrderedChunkWriter(
      MAX_CHUNK_SIZE * 3 + 128,
      (chunk, offset) => {
        received.push(chunk)
        offsets.push(offset)
      },
      onComplete,
    )

    const c0 = new Uint8Array(MAX_CHUNK_SIZE).fill(0x11)
    const c1 = new Uint8Array(MAX_CHUNK_SIZE).fill(0x22)
    const c2 = new Uint8Array(MAX_CHUNK_SIZE).fill(0x33)
    const c3 = new Uint8Array(128).fill(0x44)

    // Deliver chunk 1 before chunk 0, and final chunk 3 before chunk 2
    writer.push(MAX_CHUNK_SIZE, c1, false)
    expect(received).toHaveLength(0)

    writer.push(0, c0, false)
    expect(received).toHaveLength(2)
    expect(onComplete).not.toHaveBeenCalled()

    writer.push(MAX_CHUNK_SIZE * 3, c3, true)
    expect(received).toHaveLength(2)
    expect(onComplete).not.toHaveBeenCalled()

    writer.push(MAX_CHUNK_SIZE * 2, c2, false)
    expect(received).toHaveLength(4)
    expect(onComplete).toHaveBeenCalledTimes(1)

    expect(offsets).toEqual([0, 1, 2, 3].map((i) => i * MAX_CHUNK_SIZE))
    const actual = Buffer.from(concatChunks(received))
    expect(actual.equals(concatChunks([c0, c1, c2, c3]))).toBe(true)
  })

  it('ignores duplicate or stale chunks', () => {
    const received: Uint8Array[] = []
    const onComplete = vi.fn()
    const writer = new OrderedChunkWriter(
      6,
      (chunk) => received.push(chunk),
      onComplete,
    )

    const c0 = new Uint8Array([1, 2, 3])
    const c1 = new Uint8Array([4, 5, 6])

    writer.push(3, c1, true)
    // Duplicate buffered chunk
    writer.push(3, c1, true)
    // Flush chunk 0 + chunk 1
    writer.push(0, c0, false)
    // Chunk after close
    writer.push(6, c0, false)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(concatChunks(received)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
  })

  it('ignores chunks that were already written', () => {
    const onChunk = vi.fn()
    const writer = new OrderedChunkWriter(2, onChunk, vi.fn())

    writer.push(0, new Uint8Array([1]), false)
    writer.push(0, new Uint8Array([1]), false)

    expect(onChunk).toHaveBeenCalledTimes(1)
  })

  it('reports the empty chunk of an empty file before completing', () => {
    const calls: string[] = []
    const writer = new OrderedChunkWriter(
      0,
      (chunk, offset) => calls.push(`chunk ${offset} ${chunk.byteLength}`),
      () => calls.push('complete'),
    )

    writer.push(0, new Uint8Array(0), true)

    expect(calls).toEqual(['chunk 0 0', 'complete'])
  })

  it.each([
    { offset: 0.5, bytes: [1], final: false },
    { offset: -1, bytes: [1], final: false },
    { offset: 1, bytes: [1, 2, 3], final: true },
    { offset: 0, bytes: [1], final: true },
    { offset: 0, bytes: [1, 2, 3], final: false },
    { offset: 0, bytes: [], final: false },
  ])(
    'rejects invalid chunk metadata %j before writing',
    ({ offset, bytes, final }) => {
      const onChunk = vi.fn()
      const onComplete = vi.fn()
      const writer = new OrderedChunkWriter(3, onChunk, onComplete)
      expect(() => writer.push(offset, Uint8Array.from(bytes), final)).toThrow(
        'Invalid chunk range or final marker',
      )
      expect(onChunk).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
    },
  )
})
