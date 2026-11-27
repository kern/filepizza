import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUploaderChannel } from '../../src/hooks/useUploaderChannel'
import { QueryClientProvider, testQueryClient } from '../support/providers'

function wrapper() {
  const client = testQueryClient()
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useUploaderChannel', () => {
  it('creates a channel, renews it, and sends a beacon when the page unloads', async () => {
    const request = vi.fn<typeof fetch>(async (input) => {
      if (input === '/api/create') {
        return Response.json({
          shortSlug: 'short',
          longSlug: 'long/slug',
          secret: 'secret',
        })
      }
      return Response.json({ success: true })
    })
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon })
    const { result, unmount } = renderHook(
      () => useUploaderChannel('test-peer', 80, request),
      {
        wrapper: wrapper(),
      },
    )
    expect(result.current.isLoading).toBe(true)
    await waitFor(() =>
      expect(result.current.longURL).toMatch(/\/download\/long\/slug$/),
    )
    expect(result.current.shortURL).toMatch(/\/download\/short$/)

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/api/renew',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ slug: 'short', secret: 'secret' }),
        }),
      ),
    )
    act(() => window.dispatchEvent(new Event('beforeunload')))
    expect(sendBeacon).toHaveBeenCalledWith(
      '/api/destroy',
      JSON.stringify({ slug: 'short' }),
    )
    unmount()
    window.dispatchEvent(new Event('beforeunload'))
    expect(sendBeacon).toHaveBeenCalledOnce()
  })

  it('surfaces a rejected create request', async () => {
    const request = async () => Response.json({}, { status: 503 })
    const { result } = renderHook(
      () => useUploaderChannel('test-peer', undefined, request),
      {
        wrapper: wrapper(),
      },
    )
    await waitFor(() =>
      expect(result.current.error?.message).toBe('Network response was not ok'),
    )
    expect(result.current.shortURL).toBeUndefined()
  })

  it('keeps the published links when a renewal fails', async () => {
    const request = vi.fn<typeof fetch>(async (input) =>
      input === '/api/create'
        ? Response.json({
            shortSlug: 'short',
            longSlug: 'long',
            secret: 'secret',
          })
        : Response.json({}, { status: 503 }),
    )
    const { result } = renderHook(
      () => useUploaderChannel('test-peer', 80, request),
      {
        wrapper: wrapper(),
      },
    )
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/api/renew', expect.anything()),
    )
    expect(result.current.shortSlug).toBe('short')
  })
})
