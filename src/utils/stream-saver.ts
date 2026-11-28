// Streams a download straight to disk through the service worker in
// public/sw.js (loaded via the hidden public/stream.html iframe). Browsers that
// cannot do that fall back to buffering the file in memory as a Blob.

const MITM_PATH = '/stream.html'
const MIME_TYPE = 'application/octet-stream; charset=utf-8'

let mitm: Promise<HTMLIFrameElement> | null = null

function loadMitm(): Promise<HTMLIFrameElement> {
  mitm ??= new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.hidden = true
    iframe.src = MITM_PATH
    iframe.addEventListener('load', () => resolve(iframe), { once: true })
    document.body.appendChild(iframe)
  })
  return mitm
}

// Safari can't download anything that comes from a service worker.
function isSafari(): boolean {
  const w = window as unknown as Record<string, unknown>
  return /^\[object \w*Constructor\]$/.test(String(w.HTMLElement)) || !!w.safari
}

function canUseServiceWorker(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator && !isSafari()
}

function supportsTransferableStreams(): boolean {
  try {
    const { readable } = new TransformStream()
    const { port1, port2 } = new MessageChannel()
    port1.postMessage(readable, [readable])
    port1.close()
    port2.close()
    return true
  } catch {
    return false
  }
}

// Make the filename RFC 5987 compatible.
function encodeFilename(filename: string): string {
  return encodeURIComponent(filename.replace(/\//g, ':'))
    .replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A')
}

function createBlobWriter(filename: string): WritableStream<Uint8Array> {
  let chunks: Uint8Array[] = []
  return new WritableStream({
    write(chunk) {
      chunks.push(chunk)
    },
    close() {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob(chunks, { type: MIME_TYPE }))
      link.download = filename
      link.click()
    },
    abort() {
      chunks = []
    },
  })
}

export function createWriteStream(
  filename: string,
  { size }: { size?: number } = {},
): WritableStream<Uint8Array> {
  if (!canUseServiceWorker()) return createBlobWriter(filename)

  const channel = new MessageChannel()
  const transferable = supportsTransferableStreams()
  const encoded = encodeFilename(filename)
  const headers: Record<string, string | number> = {
    'Content-Type': MIME_TYPE,
    'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
  }
  if (size) headers['Content-Length'] = size

  let writable: WritableStream<Uint8Array>
  if (transferable) {
    const { readable, writable: sink } = new TransformStream<
      Uint8Array,
      Uint8Array
    >()
    channel.port1.postMessage({ readableStream: readable }, [readable])
    writable = sink
  } else {
    writable = new WritableStream({
      write(chunk) {
        channel.port1.postMessage(chunk)
      },
      close() {
        channel.port1.postMessage('end')
      },
      abort() {
        channel.port1.postMessage('abort')
        channel.port1.close()
      },
    })
  }

  channel.port1.onmessage = ({ data }) => {
    if (data.download) {
      // We never remove this iframe: doing so can interrupt the save.
      const iframe = document.createElement('iframe')
      iframe.hidden = true
      iframe.src = data.download
      document.body.appendChild(iframe)
    } else {
      // The worker aborted the download: echo it back and tear down.
      channel.port1.postMessage('abort')
      channel.port1.close()
    }
  }

  void loadMitm().then((frame) =>
    frame.contentWindow!.postMessage(
      {
        transferringReadable: transferable,
        pathname: `${Math.random().toString().slice(-6)}/${encoded}`,
        headers,
      },
      window.location.origin,
      [channel.port2],
    ),
  )

  return writable
}
