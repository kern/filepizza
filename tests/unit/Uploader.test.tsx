import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Uploader from '../../src/components/Uploader'
import WebRTCProvider from '../../src/components/WebRTCProvider'
import {
  peerService,
  QueryClientProvider,
  testQueryClient,
  TestPeer,
} from '../support/providers'

describe('Uploader', () => {
  it('shows the channel loading state and then the links', async () => {
    const peer = new TestPeer()
    const service = peerService(peer)
    await service.get()
    const onStop = vi.fn()
    const request = async () =>
      Response.json({ longSlug: 'long-name', shortSlug: 'short-name' })
    render(
      <QueryClientProvider client={testQueryClient()}>
        <WebRTCProvider service={service}>
          <Uploader files={[]} password="" onStop={onStop} request={request} />
        </WebRTCProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Creating channel...')).toBeInTheDocument()
    expect(
      await screen.findByDisplayValue(/\/download\/short-name$/),
    ).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(/\/download\/long-name$/),
    ).toBeInTheDocument()
    act(() => {
      peer.emit('connection', peer.connection)
    })
    expect(screen.getByText('0 Downloading, 1 Total')).toBeInTheDocument()
    expect(screen.getByText('Downloader')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalledOnce()
    expect(peer.destroyed).toBe(true)
  })
})

it('shows a channel creation error with the uploader connected', async () => {
  const service = peerService()
  await service.get()
  render(
    <QueryClientProvider client={testQueryClient()}>
      <WebRTCProvider service={service}>
        <Uploader
          files={[]}
          password=""
          onStop={() => {}}
          request={async () => Response.json({}, { status: 503 })}
        />
      </WebRTCProvider>
    </QueryClientProvider>,
  )
  expect(
    await screen.findByText('Network response was not ok'),
  ).toBeInTheDocument()
})

it.each([{ shortSlug: 'short' }, { longSlug: 'long' }])(
  'waits for both channel links when the response is %j',
  async (slugs) => {
    const service = peerService()
    await service.get()
    const client = testQueryClient()
    render(
      <QueryClientProvider client={client}>
        <WebRTCProvider service={service}>
          <Uploader
            files={[]}
            password=""
            onStop={() => {}}
            request={async () => Response.json(slugs)}
          />
        </WebRTCProvider>
      </QueryClientProvider>,
    )
    await waitFor(() =>
      expect(client.getQueryData(['uploaderChannel', 'test-peer'])).toEqual(
        slugs,
      ),
    )
    expect(screen.getByText('Creating channel...')).toBeInTheDocument()
  },
)
