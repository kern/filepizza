// https://github.com/jimmywarting/StreamSaver.js/blob/master/sw.js

/* global self ReadableStream Response */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const map = new Map()

// This should be called once per download
// Each event has a dataChannel that the data will be piped through
self.onmessage = (event) => {
  // We send a heartbeat every x secound to keep the
  // service worker alive if a transferable stream is not sent
  if (event.data === 'ping') {
    return
  }

  const data = event.data
  const downloadUrl =
    data.url ||
    self.registration.scope +
      Math.random() +
      '/' +
      (typeof data === 'string' ? data : data.filename)
  const port = event.ports[0]
  const metadata = new Array(3) // [stream, data, port]

  metadata[1] = data
  metadata[2] = port

  // Note to self:
  // old streamsaver v1.2.0 might still use `readableStream`...
  // but v2.0.0 will always transfer the stream throught MessageChannel #94
  if (event.data.readableStream) {
    metadata[0] = event.data.readableStream
  } else if (event.data.transferringReadable) {
    port.onmessage = (evt) => {
      port.onmessage = null
      metadata[0] = evt.data.readableStream
    }
  } else {
    metadata[0] = createStream(port)
  }

  map.set(downloadUrl, metadata)
  port.postMessage({ download: downloadUrl })
}

function createStream(port) {
  // ReadableStream is only supported by chrome 52
  return new ReadableStream({
    start(controller) {
      // When we receive data on the messageChannel, we write
      port.onmessage = ({ data }) => {
        if (data === 'end') {
          return controller.close()
        }

        if (data === 'abort') {
          controller.error('Aborted the download')
          return
        }

        controller.enqueue(data)
      }
    },
    cancel() {
      console.log('user aborted')
    },
  })
}

// Up to this much of a download is kept so it can be served again from the
// start. Browsers read a service worker's stream far ahead of the person saving
// it, and some drop the request (to ask where to save, or to hand the download
// to another tool) and then ask for the same URL again. Past this size the
// download can no longer be replayed and streams without being kept.
const REPLAY_LIMIT = 128 * 1024 * 1024

// How long a download that nobody is reading, or that has finished, stays
// available for another request before its memory is released.
const RETRY_WINDOW_MS = 60 * 1000

function serve(url, hijacke) {
  const replay = (hijacke.replay ??= {
    reader: hijacke[0].getReader(),
    // Everything read from the source, in order. Each request walks it from
    // the start, so no request depends on when another one read a chunk.
    chunks: [],
    bytes: 0,
    retained: true,
    finished: false,
    reading: undefined,
    position: 0,
    attempt: 0,
    timer: undefined,
  })
  const attempt = ++replay.attempt
  clearTimeout(replay.timer)

  // Reads one more chunk from the source and appends it to the log. Only one
  // read is ever in flight, shared by whoever is waiting for it, so a request
  // that was dropped mid-read still leaves its chunk in the log for the next.
  const fill = () =>
    (replay.reading ??= replay.reader.read().then(({ done, value }) => {
      replay.reading = undefined
      if (done) {
        replay.finished = true
        return
      }
      replay.chunks.push(value)
      replay.bytes += value.byteLength
      if (replay.retained && replay.bytes > REPLAY_LIMIT) {
        // Too big to serve again: stop keeping what was already delivered.
        replay.retained = false
        for (let i = 0; i < replay.position; i++) replay.chunks[i] = undefined
      }
    }))

  // Frees the kept data, and stops the source unless it already finished.
  const release = (reason) => {
    map.delete(url)
    replay.chunks = []
    if (!replay.finished) replay.reader.cancel(reason)
  }
  const releaseLater = (reason) => {
    clearTimeout(replay.timer)
    replay.timer = setTimeout(() => release(reason), RETRY_WINDOW_MS)
  }

  let next = 0
  return new ReadableStream(
    {
      async pull(controller) {
        // A newer request took over this download.
        if (replay.attempt !== attempt) return controller.close()

        if (next === replay.chunks.length && !replay.finished) {
          await fill()
          if (replay.attempt !== attempt) return controller.close()
        }
        if (next < replay.chunks.length) {
          const chunk = replay.chunks[next]
          // Once it can't be served again, a delivered chunk is not kept.
          if (!replay.retained) replay.chunks[next] = undefined
          next++
          replay.position = next
          return controller.enqueue(chunk)
        }

        controller.close()
        if (replay.retained) releaseLater()
        else map.delete(url)
      },
      cancel(reason) {
        if (replay.attempt !== attempt) return
        // Too big to replay: nobody can ask again, so stop right away.
        if (!replay.retained) return release(reason)
        // Otherwise wait a while in case the request comes back.
        releaseLater(reason)
      },
    },
    // Read from the source only when the browser asks for more.
    { highWaterMark: 0 },
  )
}

self.onfetch = (event) => {
  const url = event.request.url

  // this only works for Firefox
  if (url.endsWith('/ping')) {
    return event.respondWith(new Response('pong'))
  }

  const hijacke = map.get(url)

  if (!hijacke) return null

  // A download that outgrew the replay buffer can't be served from the start
  // again, so a second request for it is refused like any unknown URL.
  if (hijacke.replay && !hijacke.replay.retained) {
    map.delete(url)
    return null
  }

  const [, data, port] = hijacke

  // Not comfortable letting any user control all headers
  // so we only copy over the length & disposition
  const responseHeaders = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',

    // To be on the safe side, The link can be opened in a iframe.
    // but octet-stream should stop it.
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Security-Policy': "default-src 'none'",
    'X-WebKit-CSP': "default-src 'none'",
    'X-XSS-Protection': '1; mode=block',
  })

  let headers = new Headers(data.headers || {})

  if (headers.has('Content-Length')) {
    responseHeaders.set('Content-Length', headers.get('Content-Length'))
  }

  if (headers.has('Content-Disposition')) {
    responseHeaders.set(
      'Content-Disposition',
      headers.get('Content-Disposition'),
    )
  }

  // data, data.filename and size should not be used anymore
  if (data.size) {
    console.warn('Depricated')
    responseHeaders.set('Content-Length', data.size)
  }

  let fileName = typeof data === 'string' ? data : data.filename
  if (fileName) {
    console.warn('Depricated')
    // Make filename RFC5987 compatible
    fileName = encodeURIComponent(fileName)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A')
    responseHeaders.set(
      'Content-Disposition',
      "attachment; filename*=UTF-8''" + fileName,
    )
  }

  event.respondWith(
    new Response(serve(url, hijacke), { headers: responseHeaders }),
  )

  port.postMessage({ debug: 'Download started' })
}
