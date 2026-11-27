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

afterEach(() => vi.unstubAllGlobals())

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

it('serves a transferred stream once and copies only allowed response headers', async () => {
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
  expect(worker.fetch('/files/ready')).toBeUndefined()
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

  worker.send({ url: 'http://filepizza.test/cancelled' })
  await worker.fetch('/cancelled')?.body?.cancel()
})
