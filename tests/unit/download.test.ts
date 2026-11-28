import { expect, it } from 'vitest'
import { streamDownloadSingleFile } from '../../src/utils/download'

it('streams bytes to an injected destination', async () => {
  const result: Uint8Array[] = []
  const open = (name: string, options: { size: number }) => {
    expect(name).toBe('file.bin')
    expect(options).toEqual({ size: 3 })
    return new WritableStream<Uint8Array>({
      write(chunk) {
        result.push(chunk)
      },
    })
  }
  const file = {
    name: 'file.bin',
    size: 3,
    stream: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(Uint8Array.of(1, 2, 3))
          controller.close()
        },
      }),
  }
  await streamDownloadSingleFile(file, file.name, open)
  expect(result).toEqual([Uint8Array.of(1, 2, 3)])
})
