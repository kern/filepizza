// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'

type Port = {
  onmessage: ((event: { data: unknown }) => void) | null
  postMessage(message: object): void
  messages: object[]
}

function createPort(): Port {
  return {
    onmessage: null,
    messages: [],
    postMessage(message) {
      this.messages.push(message)
    },
  }
}

async function startWorker() {
  const scope = 'http://filepizza.test/'
  const skipWaiting = vi.fn(async () => {})
  const claim = vi.fn(async () => {})
  const worker = Object.assign(new EventTarget(), {
    registration: { scope },
    skipWaiting,
    clients: { claim },
    onmessage: (_event: { data: unknown; ports: Port[] }) => {},
    onfetch: (_event: {
      request: Request
      respondWith: (response: Response) => void
    }) => {},
  })
  vi.stubGlobal('self', worker)
  vi.resetModules()
  // @ts-expect-error The service worker is a classic script loaded for its side effects.
  await import('../../public/sw.js')

  return {
    worker,
    skipWaiting,
    claim,
    send(data: unknown, port = createPort()) {
      worker.onmessage({ data, ports: [port] })
      return port
    },
    fetch(path: string) {
      const respondWith = vi.fn<(response: Response) => void>()
      worker.onfetch({
        request: new Request(new URL(path, scope)),
        respondWith,
      })
      return respondWith.mock.calls[0]?.[0]
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('installs and claims clients, handles heartbeat traffic, and ignores other requests', async () => {
  const worker = await startWorker()
  worker.worker.dispatchEvent(new Event('install'))
  const waitUntil = vi.fn<(promise: Promise<void>) => void>()
  worker.worker.dispatchEvent(
    Object.assign(new Event('activate'), { waitUntil }),
  )
  expect(worker.skipWaiting).toHaveBeenCalledOnce()
  expect(worker.claim).toHaveBeenCalledOnce()
  expect(waitUntil).toHaveBeenCalledOnce()
  expect(worker.send('ping').messages).toEqual([])
  expect(await worker.fetch('/ping')?.text()).toBe('pong')
  expect(worker.fetch('/missing')).toBeUndefined()
})

it('serves a transferred stream and copies only allowed response headers', async () => {
  const worker = await startWorker()
  const port = worker.send({
    url: 'http://filepizza.test/files/ready',
    headers: {
      'Content-Length': '3',
      'Content-Disposition': 'attachment; filename="file.txt"',
      'X-Arbitrary': 'discard',
    },
    readableStream: new Response('abc').body,
  })
  expect(port.messages[0]).toEqual({
    download: 'http://filepizza.test/files/ready',
  })
  const response = worker.fetch('/files/ready')!
  expect(response.headers.get('content-length')).toBe('3')
  expect(response.headers.get('content-disposition')).toBe(
    'attachment; filename="file.txt"',
  )
  expect(response.headers.get('x-arbitrary')).toBeNull()
  expect(await response.text()).toBe('abc')
  expect(port.messages.at(-1)).toEqual({ debug: 'Download started' })
})

it('accepts a deferred transferable stream and legacy filename and size fields', async () => {
  const worker = await startWorker()
  const port = worker.send({
    filename: "it's*(ok).txt",
    size: 3,
    transferringReadable: true,
  })
  port.onmessage?.({ data: { readableStream: new Response('abc').body } })
  expect(port.onmessage).toBeNull()

  const { download } = port.messages[0] as { download: string }
  const response = worker.fetch(download)!
  expect(response.headers.get('content-length')).toBe('3')
  expect(response.headers.get('content-disposition')).toMatch(
    /it%27s%2A%28ok%29\.txt/,
  )
  expect(await response.text()).toBe('abc')
})

it('accepts chunks through a message port and handles end, abort, and cancel', async () => {
  const worker = await startWorker()
  const legacy = worker.send('legacy.bin')
  const { download } = legacy.messages[0] as { download: string }
  const response = worker.fetch(download)!
  legacy.onmessage?.({ data: new TextEncoder().encode('abc') })
  legacy.onmessage?.({ data: 'end' })
  expect(await response.text()).toBe('abc')

  const aborted = worker.send({ url: '/aborted' })
  const abortedResponse = worker.worker.onfetch
  const respondWith = vi.fn<(response: Response) => void>()
  abortedResponse({ request: { url: '/aborted' } as Request, respondWith })
  aborted.onmessage?.({ data: 'abort' })
  await expect(respondWith.mock.calls[0][0].text()).rejects.toBe(
    'Aborted the download',
  )

  // Dropping a request keeps the download for a retry; once nobody comes back
  // the source is cancelled.
  vi.useFakeTimers()
  worker.send({ url: 'http://filepizza.test/cancelled' })
  await worker.fetch('/cancelled')?.body?.cancel()
  vi.advanceTimersByTime(61_000)
  expect(worker.fetch('/cancelled')).toBeUndefined()
})

const text = (value: Uint8Array | undefined) => new TextDecoder().decode(value)

function source(chunks: Array<string | Uint8Array>) {
  const cancel = vi.fn()
  const encoder = new TextEncoder()
  let next = 0
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (next === chunks.length) return controller.close()
        const chunk = chunks[next++]
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
        )
      },
      cancel,
    },
    { highWaterMark: 0 },
  )
  return { stream, cancel }
}

function startDownload(
  worker: Awaited<ReturnType<typeof startWorker>>,
  name: string,
  chunks: Array<string | Uint8Array>,
) {
  const { stream, cancel } = source(chunks)
  worker.send({
    url: `http://filepizza.test/files/${name}`,
    readableStream: stream,
  })
  return { path: `/files/${name}`, cancel }
}

it('serves a finished download again for a while, then lets it go', async () => {
  vi.useFakeTimers()
  const worker = await startWorker()
  const { path, cancel } = startDownload(worker, 'finished', ['ab', 'cd'])

  expect(await worker.fetch(path)!.text()).toBe('abcd')
  expect(await worker.fetch(path)!.text()).toBe('abcd')
  vi.advanceTimersByTime(61_000)
  expect(worker.fetch(path)).toBeUndefined()
  // Everything had already been delivered, so there was nothing to cancel.
  expect(cancel).not.toHaveBeenCalled()
})

it('serves a download from the start when the first request is dropped part way', async () => {
  const worker = await startWorker()
  const { path, cancel } = startDownload(worker, 'dropped', ['ab', 'cd', 'ef'])

  const reader = worker.fetch(path)!.body!.getReader()
  expect(text((await reader.read()).value)).toBe('ab')
  expect(text((await reader.read()).value)).toBe('cd')
  await reader.cancel()
  expect(cancel).not.toHaveBeenCalled()

  expect(await worker.fetch(path)!.text()).toBe('abcdef')
})

it('serves a request that was dropped before anything was read', async () => {
  const worker = await startWorker()
  const { path } = startDownload(worker, 'unread', ['ab', 'cd'])
  await worker.fetch(path)!.body!.cancel()
  expect(await worker.fetch(path)!.text()).toBe('abcd')
})

it('gives up on a dropped download that is not requested again', async () => {
  vi.useFakeTimers()
  const worker = await startWorker()
  const { path, cancel } = startDownload(worker, 'abandoned', ['ab', 'cd'])

  await worker.fetch(path)!.body!.cancel('closed')
  vi.advanceTimersByTime(59_000)
  expect(cancel).not.toHaveBeenCalled()
  vi.advanceTimersByTime(2_000)
  expect(cancel).toHaveBeenCalledWith('closed')
  expect(worker.fetch(path)).toBeUndefined()
})

it('does not give up on a download that was requested again in time', async () => {
  vi.useFakeTimers()
  const worker = await startWorker()
  const { path, cancel } = startDownload(worker, 'again', ['ab', 'cd'])

  await worker.fetch(path)!.body!.cancel()
  vi.advanceTimersByTime(30_000)
  const retry = worker.fetch(path)!
  vi.advanceTimersByTime(40_000)
  expect(cancel).not.toHaveBeenCalled()
  expect(await retry.text()).toBe('abcd')
})

it('ends an older request empty when a newer one takes over', async () => {
  const worker = await startWorker()
  const { path } = startDownload(worker, 'newer', ['ab', 'cd'])

  const older = worker.fetch(path)!
  const newer = worker.fetch(path)!
  expect(await older.text()).toBe('')
  expect(await newer.text()).toBe('abcd')
})

it('ignores an older request being dropped after a newer one took over', async () => {
  vi.useFakeTimers()
  const worker = await startWorker()
  const { path, cancel } = startDownload(worker, 'newest', ['ab', 'cd'])

  const older = worker.fetch(path)!
  const newer = worker.fetch(path)!
  await older.body!.cancel()
  vi.advanceTimersByTime(61_000)
  expect(cancel).not.toHaveBeenCalled()
  expect(await newer.text()).toBe('abcd')
})

it('streams, and stops replaying, once a download outgrows the replay limit', async () => {
  vi.useFakeTimers()
  const worker = await startWorker()
  const big = new Uint8Array(100 * 1024 * 1024)
  const { path, cancel } = startDownload(worker, 'big', [big, big, big])

  const reader = worker.fetch(path)!.body!.getReader()
  expect((await reader.read()).value).toBe(big)
  // Past the limit the data is no longer kept, so another request is refused.
  expect((await reader.read()).value).toBe(big)
  expect(worker.fetch(path)).toBeUndefined()

  // The download itself carries on, and stops at once if it is dropped.
  expect((await reader.read()).value).toBe(big)
  await reader.cancel('stopped')
  expect(cancel).toHaveBeenCalledWith('stopped')
})

it('finishes a download that outgrew the replay limit without keeping it', async () => {
  const worker = await startWorker()
  const big = new Uint8Array(100 * 1024 * 1024)
  const { path } = startDownload(worker, 'bigdone', [big, big])

  const response = worker.fetch(path)!
  expect((await response.arrayBuffer()).byteLength).toBe(200 * 1024 * 1024)
  expect(worker.fetch(path)).toBeUndefined()
})

// A source that only produces data when the test says so.
function manualSource() {
  const encoder = new TextEncoder()
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>(
    {
      start(c) {
        controller = c
      },
    },
    { highWaterMark: 0 },
  )
  return {
    stream,
    enqueue: (chunk: string) => controller.enqueue(encoder.encode(chunk)),
    close: () => controller.close(),
  }
}

it('keeps a chunk that was being read when its request was dropped', async () => {
  const worker = await startWorker()
  const manual = manualSource()
  worker.send({
    url: 'http://filepizza.test/files/inflight',
    readableStream: manual.stream,
  })

  // The first request is waiting on the source when the browser drops it...
  const reader = worker.fetch('/files/inflight')!.body!.getReader()
  const pending = reader.read()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await reader.cancel()
  await pending

  // ...and the request that replaces it needs every chunk, in order, including
  // the one the dropped request was waiting for.
  const retry = worker.fetch('/files/inflight')!.text()
  // The retry is waiting on the source too when the data arrives.
  await new Promise((resolve) => setTimeout(resolve, 0))
  manual.enqueue('ab')
  manual.enqueue('cd')
  manual.enqueue('ef')
  manual.close()
  expect(await retry).toBe('abcdef')
})

it('ends an older request that was waiting on the source when a newer one took over', async () => {
  const worker = await startWorker()
  const manual = manualSource()
  worker.send({
    url: 'http://filepizza.test/files/waiting',
    readableStream: manual.stream,
  })

  const older = worker.fetch('/files/waiting')!.text()
  // Let the older request start waiting on the source before the newer arrives.
  await new Promise((resolve) => setTimeout(resolve, 0))
  const newer = worker.fetch('/files/waiting')!.text()
  manual.enqueue('ab')
  manual.enqueue('cd')
  manual.close()
  expect(await older).toBe('')
  expect(await newer).toBe('abcd')
})
