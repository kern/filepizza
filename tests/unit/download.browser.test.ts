import { expect, it, vi } from 'vitest'

it('installs streams in browsers without a native ReadableStream', async () => {
  const streamGlobals = Object.getOwnPropertyNames(globalThis).filter((name) =>
    /^(Readable|Writable|Transform|ByteLengthQueuing|CountQueuing)/.test(name),
  )
  const descriptors = new Map(
    streamGlobals.map(
      (name) =>
        [name, Object.getOwnPropertyDescriptor(globalThis, name)!] as const,
    ),
  )
  vi.resetModules()
  vi.stubGlobal('ReadableStream', undefined)
  try {
    await import('../../src/utils/download')
    expect(typeof ReadableStream).toBe('function')
  } finally {
    vi.unstubAllGlobals()
    for (const [name, descriptor] of descriptors) {
      Object.defineProperty(globalThis, name, descriptor)
    }
  }
})

it('streams bytes to an injected destination in Node', async () => {
  vi.resetModules()
  vi.stubGlobal('window', undefined)
  let streamDownloadSingleFile: typeof import('../../src/utils/download').streamDownloadSingleFile
  try {
    ;({ streamDownloadSingleFile } = await import('../../src/utils/download'))
  } finally {
    vi.unstubAllGlobals()
  }
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
