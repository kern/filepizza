import { describe, it, expect } from 'vitest'
import { isFinalChunk, MAX_CHUNK_SIZE } from '../../src/hooks/useUploaderConnections'

describe('isFinalChunk', () => {
  it('marks last chunk when file size is exact multiple of chunk size', () => {
    const fileSize = MAX_CHUNK_SIZE * 2
    // when offset points to start of last chunk
    expect(isFinalChunk(MAX_CHUNK_SIZE, fileSize)).toBe(true)
  })

  it('returns false for middle chunks', () => {
    const fileSize = MAX_CHUNK_SIZE * 3 + 123
    expect(isFinalChunk(MAX_CHUNK_SIZE, fileSize)).toBe(false)
  })
})
