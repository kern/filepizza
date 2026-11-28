import { describe, expect, it } from 'vitest'
import {
  extractFileList,
  filesFromInput,
  formatSize,
  getFileName,
} from '../../src/fs'

function fileEntry(path: string) {
  return {
    fullPath: path,
    isDirectory: false,
    file: (receive: (file: File) => void) =>
      receive(new File(['test'], path.split('/').at(-1)!)),
  }
}

type Entry = ReturnType<typeof fileEntry> | Directory

interface Directory {
  isDirectory: true
  createReader(): {
    readEntries(receive: (entries: Entry[]) => void): void
  }
}

function directory(...batches: Entry[][]): Directory {
  return {
    isDirectory: true,
    createReader() {
      return {
        readEntries(receive) {
          receive(batches.shift() ?? [])
        },
      }
    },
  }
}

function dragEvent(...entries: (Entry | null)[]): DragEvent {
  return {
    dataTransfer: {
      items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    },
  } as unknown as DragEvent
}

describe('file helpers', () => {
  it('scans nested directories, including multiple reader batches', async () => {
    const files = await extractFileList(
      dragEvent(
        directory(
          [fileEntry('/folder/first.txt')],
          [directory([fileEntry('/folder/nested/second.txt')])],
        ),
        null,
        fileEntry('/third.txt'),
      ),
    )
    expect(files.map(getFileName)).toEqual([
      'first.txt',
      'second.txt',
      'third.txt',
    ])
    expect(files).toMatchObject([
      { entryFullPath: '/folder/first.txt' },
      { entryFullPath: '/folder/nested/second.txt' },
      { entryFullPath: '/third.txt' },
    ])
  })

  it('handles absent and empty drop payloads', async () => {
    await expect(
      extractFileList({ dataTransfer: null } as DragEvent),
    ).resolves.toEqual([])
    await expect(extractFileList(dragEvent())).resolves.toEqual([])
  })

  it('formats empty files and conversions between units', () => {
    expect(formatSize(0)).toBe('0 Bytes')
    expect(formatSize(999)).toBe('999 Bytes')
    expect(formatSize(1200)).toBe('1.20 KB')
  })
})

it('uses the entry path when a browser file has no name', () => {
  const file = new File([], '')
  expect(getFileName(file)).toBe('')
  expect(
    getFileName(Object.assign(file, { entryFullPath: '/folder/unnamed' })),
  ).toBe('/folder/unnamed')
})

describe('filesFromInput', () => {
  it('keeps the path inside a picked folder and leaves plain files alone', () => {
    const inFolder = new File(['a'], 'a.txt')
    Object.defineProperty(inFolder, 'webkitRelativePath', {
      value: 'photos/a.txt',
    })
    const plain = new File(['b'], 'b.txt')

    const [first, second] = filesFromInput([inFolder, plain] as never)
    expect(first.entryFullPath).toBe('/photos/a.txt')
    expect(second.entryFullPath).toBeUndefined()
  })
})
