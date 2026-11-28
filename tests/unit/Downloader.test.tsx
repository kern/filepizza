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

  it('explains when the uploader goes away before the download is done', async () => {
    const { receive, open, peer } = await renderDownloader()
    open()
    receive({
      type: MessageType.Info,
      files: [{ fileName: 'test.txt', type: 'text/plain', size: 2 }],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(
      screen.getByRole('button', { name: 'Stop Download' }),
    ).toBeInTheDocument()

    act(() => peer.connection.close())

    expect(screen.getByRole('alert')).toHaveTextContent(
      /uploader stopped sharing or lost their connection/,
    )
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull()
    expect(screen.getByRole('link', { name: /serve up/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('does not offer a download that can no longer start after the uploader leaves', async () => {
    const { receive, open, peer } = await renderDownloader()
    open()
    receive({
      type: MessageType.Info,
      files: [{ fileName: 'test.txt', type: 'text/plain', size: 2 }],
    })
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()

    act(() => peer.connection.close())

    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('says so when the downloader stops the download themselves', async () => {
    const { receive, open } = await renderDownloader()
    open()
    receive({
      type: MessageType.Info,
      files: [{ fileName: 'test.txt', type: 'text/plain', size: 2 }],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop Download' }))

    expect(screen.getByText('You stopped this download.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull()
  })
})
