import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ReportTermsViolationButton from '../../src/components/ReportTermsViolationButton'
import WebRTCProvider from '../../src/components/WebRTCProvider'
import {
  peerService,
  QueryClientProvider,
  testQueryClient,
  TestPeer,
} from '../support/providers'

async function renderReport(request: typeof fetch, peer = new TestPeer()) {
  const service = peerService(peer)
  await service.get()
  const location = { href: '/' }
  render(
    <QueryClientProvider client={testQueryClient()}>
      <WebRTCProvider service={service}>
        <ReportTermsViolationButton
          uploaderPeerID="peer"
          slug="slug"
          request={request}
          location={location}
        />
      </WebRTCProvider>
    </QueryClientProvider>,
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Report terms violation' }),
  )
  return { peer, location }
}

describe('ReportTermsViolationButton', () => {
  it('opens the report dialog and cancels it', async () => {
    await renderReport(async () => Response.json({}))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('destroys the channel and redirects when the peer transport opens', async () => {
    const request = vi.fn(async () => Response.json({}))
    const { peer, location } = await renderReport(request)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm report' }))
    })
    expect(request).toHaveBeenCalledWith(
      '/api/destroy',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ slug: 'slug' }),
      }),
    )
    expect(location.href).toBe('/')
    act(() => peer.connection.accept())
    expect(location.href).toBe('/reported')
    expect(peer.connection.open).toBe(false)
  })
})

it('dismisses the dialog only when clicking outside its content', async () => {
  await renderReport(async () => Response.json({}))
  fireEvent.click(screen.getByRole('heading', { name: /suspicious delivery/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('dialog'))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('redirects after two seconds even when the request fails and the peer does not open', async () => {
  const { location } = await renderReport(async () =>
    Response.json({}, { status: 503 }),
  )
  vi.useFakeTimers()
  try {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm report' }))
    })
    expect(location.href).toBe('/')
    act(() => vi.advanceTimersByTime(2_000))
    expect(location.href).toBe('/reported')
  } finally {
    vi.useRealTimers()
  }
})

it('re-enables reporting when the peer fails to start the connection', async () => {
  class UnavailablePeer extends TestPeer {
    connect(): never {
      throw new Error('Connection unavailable')
    }
  }
  await renderReport(async () => Response.json({}), new UnavailablePeer())

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm report' }))
  })
  expect(screen.getByRole('button', { name: 'Confirm report' })).toBeEnabled()
})
