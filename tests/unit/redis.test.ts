// @vitest-environment node

import { createHash } from 'node:crypto'
import { createServer, type Socket } from 'node:net'
import { NextRequest } from 'next/server'
import { expect, it, vi } from 'vitest'
import { getRedisClient } from '../../src/redisClient'
import { getOrCreateChannelRepo, RedisChannelRepo } from '../../src/channel'
import { setTurnCredentials } from '../../src/coturn'
import { POST as ice } from '../../src/app/api/ice/route'
import { POST as destroy } from '../../src/app/api/destroy/route'

it('stores TURN credentials and reports a Redis channel failure through the API', async () => {
  const commands: string[][] = []
  const sockets = new Set<Socket>()
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    let buffer = ''
    socket.on('data', (data) => {
      buffer += data.toString()
      const parts = buffer.split('\r\n')
      let index = 0
      while (index < parts.length - 1) {
        const count = Number(parts[index].slice(1))
        if (index + 2 * count >= parts.length - 1) break
        const command = Array.from(
          { length: count },
          (_, i) => parts[index + 2 * (i + 1)],
        )
        index += 1 + 2 * count
        commands.push(command)
        switch (command[0].toLowerCase()) {
          case 'info':
            socket.write('$11\r\nloading:0\r\n\r\n')
            break
          case 'get':
            socket.write('-ERR unavailable\r\n')
            break
          default:
            socket.write('+OK\r\n')
        }
      }
      buffer = parts.slice(index).join('\r\n')
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Expected TCP address')
  vi.stubEnv('REDIS_URL', `redis://127.0.0.1:${address.port}`)
  vi.stubEnv('COTURN_ENABLED', '')
  const client = getRedisClient()
  try {
    expect(getOrCreateChannelRepo()).toBeInstanceOf(RedisChannelRepo)
    await setTurnCredentials('unused', 'unused', 60)
    expect(commands).toEqual([])

    vi.stubEnv('COTURN_ENABLED', 'true')
    vi.stubEnv('TURN_REALM', 'test.realm')
    await setTurnCredentials('fixed-user', 'fixed-password', 120)
    expect(commands).toContainEqual([
      'setex',
      'turn/realm/test.realm/user/fixed-user/key',
      '120',
      createHash('md5')
        .update('fixed-user:test.realm:fixed-password')
        .digest('hex'),
    ])

    vi.stubEnv('TURN_REALM', '')
    const { iceServers } = await (await ice()).json()
    const turn = iceServers[1]
    expect(turn.urls).toEqual([
      expect.stringMatching(/^turn:/),
      expect.stringMatching(/^turns:/),
    ])
    expect(commands).toContainEqual([
      'setex',
      `turn/realm/file.pizza/user/${turn.username}/key`,
      '86400',
      createHash('md5')
        .update(`${turn.username}:file.pizza:${turn.credential}`)
        .digest('hex'),
    ])

    const response = await destroy(
      new NextRequest('http://localhost/api/destroy', {
        method: 'POST',
        body: JSON.stringify({ slug: 'known-slug' }),
      }),
    )
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Failed to destroy channel',
    })
  } finally {
    client.disconnect()
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    vi.unstubAllEnvs()
  }
})
