import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Message = { data: unknown }

class FakePort {
  static rejectStreams = false
  onmessage: ((event: Message) => void) | null = null
  sent: unknown[] = []
  closed = false
  postMessage(message: unknown) {
    if (FakePort.rejectStreams && message instanceof ReadableStream) {
      throw new Error('not transferable')
    }
    this.sent.push(message)
  }
  close() {
    this.closed = true
  }
}

class FakeChannel {
  static all: FakeChannel[] = []
  port1 = new FakePort()
  port2 = new FakePort()
  constructor() {
    FakeChannel.all.push(this)
  }
}

let frames: HTMLIFrameElement[] = []
let handshakes: Array<{ message: any; origin: string; ports: unknown[] }> = []

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.readAsArrayBuffer(blob)
  })
}

async function load() {
  vi.resetModules()
  return import('../../src/utils/stream-saver')
}

function stubBrowser({
  secure = true,
  serviceWorker = true,
  transferable = true,
  safari = false,
} = {}) {
  vi.stubGlobal('MessageChannel', FakeChannel)
  vi.stubGlobal('isSecureContext', secure)
  if (serviceWorker) vi.stubGlobal('navigator', { serviceWorker: {} })
  else vi.stubGlobal('navigator', {})
  if (safari) vi.stubGlobal('safari', {})
  FakePort.rejectStreams = !transferable

  vi.spyOn(document.body, 'appendChild').mockImplementation(((
    node: HTMLIFrameElement,
  ) => {
    frames.push(node)
    Object.defineProperty(node, 'contentWindow', {
      value: {
        postMessage: (message: any, origin: string, ports: unknown[]) =>
          handshakes.push({ message, origin, ports }),
      },
    })
    if (node.src.endsWith('/stream.html')) {
      queueMicrotask(() => node.dispatchEvent(new Event('load')))
    }
    return node
  }) as never)
}

beforeEach(() => {
  frames = []
  handshakes = []
  FakeChannel.all = []
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createWriteStream', () => {
  it('streams through the service worker with a transferred readable', async () => {
    stubBrowser()
    const { createWriteStream } = await load()
    const writable = createWriteStream("a/b (1)'*.txt", { size: 12 })
    const channel = FakeChannel.all[0]

    expect(writable).toBeInstanceOf(WritableStream)
    expect(channel.port1.sent[0]).toHaveProperty('readableStream')

    await vi.waitFor(() => expect(handshakes).toHaveLength(1))
    const { message, origin, ports } = handshakes[0]
    expect(origin).toBe(window.location.origin)
    expect(ports).toEqual([channel.port2])
    expect(message.transferringReadable).toBe(true)
    expect(message.pathname).toMatch(/^\d+\/a%3Ab%20%281%29%27%2A\.txt$/)
    expect(message.headers).toEqual({
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Disposition':
        "attachment; filename*=UTF-8''a%3Ab%20%281%29%27%2A.txt",
      'Content-Length': 12,
    })

    // The mitm frame is shared between downloads.
    createWriteStream('second.bin')
    await vi.waitFor(() => expect(handshakes).toHaveLength(2))
    expect(frames.filter((f) => f.src.endsWith('/stream.html'))).toHaveLength(1)
    expect(handshakes[1].message.headers).not.toHaveProperty('Content-Length')

    // The worker hands back a download link, which is opened in a hidden frame.
    channel.port1.onmessage!({ data: { download: 'http://x.test/dl/1' } })
    expect(frames.at(-1)!.src).toBe('http://x.test/dl/1')
    expect(frames.at(-1)!.hidden).toBe(true)

    // An abort from the worker is echoed back and the port is closed.
    channel.port1.onmessage!({ data: { abort: true } })
    expect(channel.port1.sent.at(-1)).toBe('abort')
    expect(channel.port1.closed).toBe(true)
  })

  it('posts chunks over the channel when streams are not transferable', async () => {
    stubBrowser({ transferable: false })
    const { createWriteStream } = await load()
    const writable = createWriteStream('file.bin')
    const channel = FakeChannel.all[0]
    await vi.waitFor(() => expect(handshakes).toHaveLength(1))
    expect(handshakes[0].message.transferringReadable).toBe(false)

    const writer = writable.getWriter()
    await writer.write(Uint8Array.of(1, 2))
    await writer.close()
    expect(channel.port1.sent).toEqual([Uint8Array.of(1, 2), 'end'])

    const aborted = createWriteStream('other.bin')
    await aborted.abort()
    expect(FakeChannel.all[2].port1.sent).toContain('abort')
    expect(FakeChannel.all[2].port1.closed).toBe(true)
  })

  it.each([
    ['an insecure context', { secure: false }],
    ['no service worker support', { serviceWorker: false }],
    ['Safari', { safari: true }],
  ])('buffers the file as a Blob with %s', async (_, options) => {
    stubBrowser(options)
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const createObjectURL = vi.fn(() => 'blob:file')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }))
    const { createWriteStream } = await load()

    const writer = createWriteStream('file.bin').getWriter()
    await writer.write(Uint8Array.of(1))
    await writer.write(Uint8Array.of(2))
    await writer.close()

    expect(click).toHaveBeenCalledOnce()
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0]
    expect(Array.from(new Uint8Array(await readBlob(blob)))).toEqual([1, 2])
    expect(FakeChannel.all).toHaveLength(0)

    await createWriteStream('dropped.bin').abort()
    expect(click).toHaveBeenCalledOnce()
  })

  it('treats an HTMLElement constructor as Safari', async () => {
    stubBrowser()
    vi.stubGlobal('HTMLElement', { toString: () => '[object HTMLElementConstructor]' })
    const { createWriteStream } = await load()
    createWriteStream('file.bin')
    expect(FakeChannel.all).toHaveLength(0)
  })
})
