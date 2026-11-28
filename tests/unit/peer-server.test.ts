// @vitest-environment node

import { once } from 'node:events'
import { get } from 'node:http'
import type { Server } from 'node:http'
import { expect, it, vi } from 'vitest'

it('serves PeerJS IDs using the production server mount path', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const server: Server = (await import('../../bin/peerjs.js')).default
  try {
    if (!server.listening) await once(server, 'listening')
    const body = await new Promise<string>((resolve, reject) => {
      get('http://127.0.0.1:9000/peerjs/filepizza/peerjs/id', (response) => {
        response.setEncoding('utf8')
        let data = ''
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          if (response.statusCode === 200) resolve(data)
          else reject(new Error(`PeerJS returned ${response.statusCode}`))
        })
      }).on('error', reject)
    })
    expect(body).toMatch(/^[\w-]+$/)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    vi.clearAllTimers()
    vi.useRealTimers()
  }
})
