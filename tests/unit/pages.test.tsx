import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RootLayout from '../../src/app/layout'
import UploadPage from '../../src/app/page'
import DownloadPage from '../../src/app/download/[...slug]/page'
import NotFound from '../../src/app/not-found'
import ReportedPage from '../../src/app/reported/page'
import { getOrCreateChannelRepo } from '../../src/channel'
import { WebRTCPeerServiceContext } from '../../src/components/WebRTCProvider'
import {
  peerService,
  QueryClientProvider,
  testQueryClient,
  TestRouter,
} from '../support/providers'

afterEach(() => vi.unstubAllGlobals())

describe('pages', () => {
  it('renders the application shell', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>Test page</p>
      </RootLayout>,
    )
    expect(markup).toContain('<html lang="en">')
    expect(markup).toContain('<main><p>Test page</p></main>')
    expect(markup).toContain('Toggle mode')
  })

  it('renders missing and reported deliveries with a link home', async () => {
    const missing = await NotFound()
    const { rerender } = render(missing, { wrapper: TestRouter })
    expect(
      screen.getByText(/this slice of FilePizza got eaten/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /serve up/i })).toHaveAttribute(
      'href',
      '/',
    )

    rerender(<ReportedPage />)
    expect(screen.getByText(/delivery has been halted/)).toBeInTheDocument()
  })

  it('sets up a valid download and rejects an unknown slug', async () => {
    const repo = getOrCreateChannelRepo()
    const channel = await repo.createChannel('test-uploader')
    try {
      const page = await DownloadPage({
        params: Promise.resolve({ slug: channel.longSlug.split('/') }),
      })
      expect(renderToStaticMarkup(page)).toContain(
        'Initializing WebRTC peer...',
      )
    } finally {
      await repo.destroyChannel(channel.shortSlug)
    }
    await expect(
      DownloadPage({ params: Promise.resolve({ slug: ['missing'] }) }),
    ).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('selects, adds and removes files before cancelling an upload', async () => {
    const user = userEvent.setup()
    const { container } = render(<UploadPage />)
    await user.click(screen.getByRole('button', { name: /drop a file/i }))
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!
    await user.upload(
      input,
      new File(['a'], 'first.txt', { type: 'text/plain' }),
    )
    expect(screen.getByText(/start uploading 1 file/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add more files/i }))
    const add = container.querySelector<HTMLInputElement>('#add-files-input')!
    await user.upload(
      add,
      new File(['b'], 'second.txt', { type: 'text/plain' }),
    )
    expect(screen.getByText(/start uploading 2 files/)).toBeInTheDocument()
    expect(screen.getByText('second.txt')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/secret password/), 'hello')
    await user.click(screen.getAllByRole('button', { name: '✕' })[1])
    expect(screen.queryByText('second.txt')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(
      screen.getByRole('button', { name: /drop a file/i }),
    ).toBeInTheDocument()
  })

  it('starts sharing selected files and returns to confirmation when stopped', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', async () =>
      Response.json({ shortSlug: 'short', longSlug: 'long' }),
    )
    const service = peerService()
    const { container } = render(
      <WebRTCPeerServiceContext.Provider value={service}>
        <QueryClientProvider client={testQueryClient()}>
          <UploadPage />
        </QueryClientProvider>
      </WebRTCPeerServiceContext.Provider>,
    )
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!
    await user.upload(input, new File(['a'], 'document.txt'))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(
      screen.getByText('Leave this tab open. FilePizza does not store files.'),
    ).toBeInTheDocument()

    const stop = await screen.findByRole('button', { name: /stop/i })
    await user.click(stop)
    expect(screen.getByText(/start uploading 1 file/)).toBeInTheDocument()
  })
})
