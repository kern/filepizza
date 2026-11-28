import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isNotFound } from '@tanstack/react-router'
import { UploadPage } from '../../src/routes/index'
import {
  DownloadPage,
  Route as DownloadRoute,
} from '../../src/routes/download.$'
import NotFound from '../../src/components/NotFound'
import { ReportedPage } from '../../src/routes/reported'
import { getOrCreateChannelRepo } from '../../src/channel'
import { WebRTCPeerServiceContext } from '../../src/components/WebRTCProvider'
import {
  peerService,
  QueryClientProvider,
  testQueryClient,
  TestRouter,
} from '../support/providers'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    validator: (validate: (data: unknown) => unknown) => ({
      handler:
        (fn: (ctx: { data: unknown }) => unknown) =>
        ({ data }: { data: unknown }) =>
          fn({ data: validate(data) }),
    }),
  }),
}))

afterEach(() => vi.unstubAllGlobals())

describe('pages', () => {
  it('renders missing and reported deliveries with a link home', async () => {
    const { rerender } = render(<NotFound />, { wrapper: TestRouter })
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

  it('loads a valid download and rejects an unknown slug', async () => {
    const repo = getOrCreateChannelRepo()
    const channel = await repo.createChannel('test-uploader')
    const load = (slug: string) =>
      (
        DownloadRoute.options.loader as unknown as (ctx: {
          params: { _splat: string }
        }) => Promise<unknown>
      )({ params: { _splat: slug } })
    try {
      const data = await load(channel.longSlug)
      expect(data).toEqual({
        slug: channel.longSlug,
        uploaderPeerID: 'test-uploader',
      })
      vi.spyOn(DownloadRoute, 'useLoaderData').mockReturnValue(data as never)
      expect(renderToStaticMarkup(<DownloadPage />)).toContain(
        'Initializing WebRTC peer...',
      )
    } finally {
      vi.restoreAllMocks()
      await repo.destroyChannel(channel.shortSlug)
    }
    await expect(load('missing')).rejects.toSatisfy(isNotFound)
    await expect(
      (
        DownloadRoute.options.loader as unknown as (ctx: {
          params: object
        }) => Promise<unknown>
      )({ params: {} }),
    ).rejects.toSatisfy(isNotFound)
    expect(await (DownloadRoute.options.head as () => unknown)()).toEqual({
      meta: [{ title: 'FilePizza • Your files, delivered.' }],
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
