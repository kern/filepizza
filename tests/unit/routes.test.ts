// @vitest-environment node

import type { ApiRequest, ApiResponse } from '../../src/routes'
import { describe, expect, it } from 'vitest'
import { getBodyKey, routeHandler, throwAPIError } from '../../src/routes'
import { error, info, warn } from '../../src/log'

function request(method: string, body: object) {
  return { method, body } as ApiRequest
}

function response() {
  const result = {
    statusCode: 0,
    body: null as unknown,
    json(body: unknown) {
      result.body = body
    },
  }
  return result
}

describe('route helpers', () => {
  it('emits a method error, a success, a custom error, and a generic error', async () => {
    const cases = [
      {
        method: 'GET',
        callback: async () => null,
        code: 405,
        body: { error: 'method not allowed' },
      },
      {
        method: 'POST',
        callback: async () => ({ ok: true }),
        code: 200,
        body: { ok: true },
      },
      {
        method: 'POST',
        callback: async () => throwAPIError('denied', 403),
        code: 403,
        body: { error: 'denied' },
      },
      {
        method: 'POST',
        callback: async () => {
          throw new Error('generic error')
        },
        code: 500,
        body: { error: 'generic error' },
      },
    ]
    for (const test of cases) {
      const result = response()
      await routeHandler<unknown>(test.callback)(
        request(test.method, {}),
        result as unknown as ApiResponse,
      )
      expect(result).toMatchObject({ statusCode: test.code, body: test.body })
    }
  })

  it('validates the type and range of route body fields', () => {
    expect(() => getBodyKey(request('POST', { slug: 42 }), 'slug')).toThrow(
      'must be a string',
    )
    expect(() => getBodyKey(request('POST', { slug: 'x' }), 'slug')).toThrow(
      'at least 3 chars',
    )
    expect(() =>
      getBodyKey(request('POST', { slug: 'x'.repeat(257) }), 'slug'),
    ).toThrow('at most 256 chars')
    expect(getBodyKey(request('POST', { slug: 'good-slug' }), 'slug')).toBe(
      'good-slug',
    )
  })

  it('uses FilePizza logging namespaces', () => {
    expect([error.namespace, info.namespace, warn.namespace]).toEqual([
      'filepizza:error',
      'filepizza:info',
      'filepizza:warn',
    ])
  })
})
