import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Downloader from '../../src/components/Downloader'
import WebRTCProvider from '../../src/components/WebRTCProvider'
import { MessageType } from '../../src/messages'
import { peerService, TestPeer, TestRouter } from '../support/providers'

async function renderDownloader() {
  const peer = new TestPeer()
  const service = peerService(peer)
  await service.get()
  const downloadSingle = vi.fn(
    async (file: { stream(): ReadableStream<Uint8Array> }) => {
      await new Response(file.stream()).arrayBuffer()
    },
  )
  render(
    <TestRouter>
      <WebRTCProvider service={service}>
        <Downloader
          uploaderPeerID="test-uploader"
          downloadOptions={{ downloadSingle }}
        />
      </WebRTCProvider>
    </TestRouter>,
  )
  const receive = (message: object) =>
    act(() => {
      peer.connection.emit('data', message)
    })
  const open = () => act(() => peer.connection.accept())
  return { peer, open, receive }
}

describe('Downloader', () => {
  it('renders the states from connection through download completion', async () => {
    const { receive, open } = await renderDownloader()
    expect(screen.getByText(/Connecting to uploader/)).toBeInTheDocument()
    open()
    expect(
      screen.getByText('Uh oh... Something went wrong.'),
    ).toBeInTheDocument()
    receive({
      type: MessageType.PasswordRequired,
      errorMessage: 'Incorrect password',
    })
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument()
    receive({
      type: MessageType.Info,
      files: [{ fileName: 'test.txt', type: 'text/plain', size: 1 }],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(
      screen.getByRole('button', { name: 'Stop Download' }),
    ).toBeInTheDocument()
    receive({
      type: MessageType.Chunk,
      fileName: 'test.txt',
      offset: 0,
      bytes: Uint8Array.of(65).buffer,
      final: true,
    })
    expect(
      await screen.findByText('You downloaded 1 file.'),
    ).toBeInTheDocument()
  })

  it('shows a link home when the uploader reports an error', async () => {
    const { receive } = await renderDownloader()
    receive({ type: MessageType.Error, error: 'Transfer unavailable' })
    expect(screen.getByText('Transfer unavailable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /serve up/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
