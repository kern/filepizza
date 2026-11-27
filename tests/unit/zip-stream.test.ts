import { expect, it } from 'vitest'
import { createZipStream } from '../../src/zip-stream'

type ZipWriter = { enqueue(entry: object): void; close(): void }

it('writes directories, timestamps, and file comments into ZIP metadata', async () => {
  const bytes = await new Response(
    createZipStream({
      start(controller) {
        const writer = controller as unknown as ZipWriter
        writer.enqueue({ name: ' folder ', directory: true })
        writer.enqueue({
          name: 'empty/',
          directory: true,
          lastModified: Date.UTC(2023, 4, 1),
        })
        writer.enqueue({
          name: 'folder/file.txt',
          comment: 'example comment',
          stream: () =>
            new ReadableStream({
              start(stream) {
                stream.close()
              },
            }),
        })
        writer.close()
      },
    }),
  ).arrayBuffer()
  const view = new DataView(bytes)
  const centralOffset = view.getUint32(bytes.byteLength - 6, true)
  expect(view.getUint32(centralOffset)).toBe(0x504b0102)
  expect(view.getUint8(centralOffset + 38)).toBe(0x10)
  expect(new TextDecoder().decode(bytes)).toContain('example comment')
  expect(new TextDecoder().decode(bytes)).toContain('folder/')
})

it('writes an empty ZIP when the underlying source closes on pull', async () => {
  const bytes = await new Response(
    createZipStream({
      pull(controller) {
        controller.close()
      },
    }),
  ).arrayBuffer()
  expect(bytes.byteLength).toBe(22)
  expect(new DataView(bytes).getUint32(0)).toBe(0x504b0506)
})

it('rejects duplicate names and writes after the archive closes', async () => {
  const zip = createZipStream({
    start(controller) {
      const writer = controller as unknown as ZipWriter
      const file = {
        name: 'file.txt',
        stream: () =>
          new ReadableStream({
            start(stream) {
              stream.close()
            },
          }),
      }
      writer.enqueue(file)
      expect(() => writer.enqueue(file)).toThrow('File already exists.')
      writer.close()
      expect(() => writer.enqueue({ ...file, name: 'another.txt' })).toThrow(
        'Cannot enqueue',
      )
      expect(() => writer.close()).toThrow('Cannot close')
    },
  })
  expect((await new Response(zip).arrayBuffer()).byteLength).toBeGreaterThan(22)
})

it('rejects file entries without a readable stream', () => {
  expect(() =>
    createZipStream({
      start(controller) {
        const writer = controller as unknown as ZipWriter
        writer.enqueue({ name: 'missing.txt' })
      },
    }),
  ).toThrow('File entries must provide a readable stream')
})
