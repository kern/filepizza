// @vitest-environment node

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { UsageError } from '../../cli/args'
import { collectFiles, mimeType, safeRelativePath } from '../../cli/paths'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'filepizza-paths-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('safeRelativePath', () => {
  it('keeps names that stay inside the folder', () => {
    expect(safeRelativePath('a.txt')).toBe('a.txt')
    expect(safeRelativePath('/a/b.txt')).toBe('a/b.txt')
    expect(safeRelativePath('a//./b\\c.txt')).toBe('a/b/c.txt')
  })

  it('refuses names that could escape it', () => {
    for (const name of [
      '',
      '/',
      '.',
      '../a',
      'a/../../b',
      '..\\a',
      'C:/Windows/a',
      'c:\\a',
      'a\0b',
    ]) {
      expect(safeRelativePath(name)).toBeNull()
    }
  })
})

describe('mimeType', () => {
  it('knows common types and falls back to a generic one', () => {
    expect(mimeType('photo.JPG')).toBe('image/jpeg')
    expect(mimeType('notes.txt')).toBe('text/plain')
    expect(mimeType('archive.xyz')).toBe('application/octet-stream')
    expect(mimeType('Makefile')).toBe('application/octet-stream')
  })
})

describe('collectFiles', () => {
  it('shares a file under its own name', async () => {
    writeFileSync(join(dir, 'hello.txt'), 'hello')
    expect(await collectFiles([join(dir, 'hello.txt')])).toEqual([
      {
        path: join(dir, 'hello.txt'),
        fileName: 'hello.txt',
        size: 5,
        type: 'text/plain',
      },
    ])
  })

  it('shares a folder with its layout, in a stable order, skipping links', async () => {
    mkdirSync(join(dir, 'album', 'raw'), { recursive: true })
    writeFileSync(join(dir, 'album', 'b.png'), 'bb')
    writeFileSync(join(dir, 'album', 'a.png'), 'a')
    writeFileSync(join(dir, 'album', 'raw', 'c.bin'), 'ccc')
    symlinkSync(join(dir, 'album', 'a.png'), join(dir, 'album', 'link.png'))

    const files = await collectFiles([join(dir, 'album')])
    expect(files.map((file) => [file.fileName, file.size])).toEqual([
      ['album/a.png', 1],
      ['album/b.png', 2],
      ['album/raw/c.bin', 3],
    ])
  })

  it('shares several paths together', async () => {
    writeFileSync(join(dir, 'a.txt'), 'a')
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, 'sub', 'b.txt'), 'b')
    const files = await collectFiles([join(dir, 'a.txt'), join(dir, 'sub')])
    expect(files.map((file) => file.fileName)).toEqual(['a.txt', 'sub/b.txt'])
  })

  it('explains what cannot be shared', async () => {
    mkdirSync(join(dir, 'empty'))
    mkdirSync(join(dir, 'one'))
    mkdirSync(join(dir, 'two'))
    writeFileSync(join(dir, 'one', 'same.txt'), '1')
    writeFileSync(join(dir, 'two', 'same.txt'), '2')

    await expect(collectFiles([join(dir, 'missing')])).rejects.toThrow(
      /Cannot read/,
    )
    await expect(collectFiles(['/dev/null'])).rejects.toThrow(
      /not a file or a folder/,
    )
    await expect(collectFiles([join(dir, 'empty')])).rejects.toThrow(
      /no files to send/,
    )
    await expect(
      collectFiles([
        join(dir, 'one', 'same.txt'),
        join(dir, 'two', 'same.txt'),
      ]),
    ).rejects.toThrow(/Two files would be shared as "same.txt"/)
    await expect(collectFiles([])).rejects.toThrow(UsageError)
  })
})
