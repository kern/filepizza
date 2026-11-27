export function toUint8Array(bytes: unknown): Uint8Array {
  if (bytes instanceof Uint8Array) {
    return bytes
  }
  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes)
  }
  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  throw new Error('Unsupported chunk payload type')
}

interface PendingChunk {
  bytes: Uint8Array
  final: boolean
}

/**
 * Buffers incoming chunks by byte offset and flushes contiguous ranges in order.
 *
 * Current uploaders send in order over an ordered data channel. This protects
 * downloads from uploader tabs that still run an older build, which can send
 * chunks out of order.
 */
export class OrderedChunkWriter {
  private nextOffset = 0
  private closed = false
  private readonly pending = new Map<number, PendingChunk>()

  constructor(
    private readonly onChunk: (bytes: Uint8Array, offset: number) => void,
    private readonly onComplete: () => void,
  ) {}

  /**
   * Records a chunk at `offset` and flushes any now-contiguous chunks.
   * Stale and duplicate chunks are ignored.
   */
  push(offset: number, bytes: Uint8Array, final: boolean): void {
    if (this.closed || offset < this.nextOffset || this.pending.has(offset)) {
      return
    }

    this.pending.set(offset, { bytes, final })

    let entry: PendingChunk | undefined
    while ((entry = this.pending.get(this.nextOffset))) {
      const entryOffset = this.nextOffset
      this.pending.delete(entryOffset)
      this.nextOffset += entry.bytes.byteLength
      // Called for empty chunks too: an empty file still needs to be acked.
      this.onChunk(entry.bytes, entryOffset)

      if (entry.final) {
        this.closed = true
        this.pending.clear()
        this.onComplete()
        break
      }
    }
  }
}
