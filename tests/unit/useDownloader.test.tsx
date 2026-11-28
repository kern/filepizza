import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WebRTCProvider from '../../src/components/WebRTCProvider'
import { useDownloader } from '../../src/hooks/useDownloader'
import { MessageType } from '../../src/messages'
import {
  streamDownloadMultipleFiles,
  streamDownloadSingleFile,
} from '../../src/utils/download'
import { peerService, TestPeer } from '../support/providers'

const first = { fileName: 'a.txt', type: 'text/plain', size: 2 }
const second = { fileName: '/b.txt', type: 'text/plain', size: 1 }

async function openDownloader() {
  const peer = new TestPeer()
  const service = peerService(peer)
  await service.get()
  const location = { href: '/' }
  const output: number[] = []
  const abortReasons: unknown[] = []
  let filename = ''
  const openDestination = (name: string) => {
    filename = name
    return new WritableStream<Uint8Array>({
      write(bytes) {
        output.push(...bytes)
      },
      abort(reason) {
        abortReasons.push(reason)
      },
    })
  }
  const deps = {
    location,
    downloadSingle: (
      file: Parameters<typeof streamDownloadSingleFile>[0],
      name: string,
    ) => streamDownloadSingleFile(file, name, openDestination),
    downloadMultiple: (
      files: Parameters<typeof streamDownloadMultipleFiles>[0],
      name: string,
    ) => streamDownloadMultipleFiles(files, name, openDestination),
  }
  const wrapper = ({ children }: PropsWithChildren) => (
    <WebRTCProvider service={service}>{children}</WebRTCProvider>
  )
  const hook = renderHook(() => useDownloader('uploader', deps), { wrapper })
  const { connection } = peer
  const receive = (message: unknown) => {
    act(() => {
      connection.emit('data', message)
    })
  }
  const chunk = (
    fileName: string,
    offset: number,
    values: number[],
    final: boolean,
  ) =>
    receive({
      type: MessageType.Chunk,
      fileName,
      offset,
      bytes: Uint8Array.from(values).buffer,
      final,
    })
  return {
    ...hook,
    peer,
    connection,
    receive,
    chunk,
    location,
    output,
    abortReasons,
    filename: () => filename,
  }
}

describe('useDownloader', () => {
  it('authenticates and acknowledges the bytes delivered to a single file', async () => {
    const download = await openDownloader()
    const { result, connection, receive, chunk } = download
    act(result.current.startDownload)
    act(() => connection.accept())
    expect(result.current.isConnected).toBe(true)
    expect(connection.messages[0]?.type).toBe(MessageType.RequestInfo)

    receive({ type: MessageType.PasswordRequired })
    receive({
      type: MessageType.PasswordRequired,
      errorMessage: 'Incorrect password',
    })
    expect(result.current.isPasswordRequired).toBe(true)
    expect(result.current.errorMessage).toBe('Incorrect password')
    act(() => result.current.submitPassword('test-password'))
    expect(connection.messages.at(-1)).toEqual({
      type: MessageType.UsePassword,
      password: 'test-password',
    })

    receive({ type: MessageType.Info, files: [first] })
    expect(result.current.totalSize).toBe(2)
    expect(result.current.isPasswordRequired).toBe(false)
    act(result.current.startDownload)
    expect(connection.messages.at(-1)).toEqual({
      type: MessageType.Start,
      fileName: first.fileName,
      offset: 0,
    })
    chunk('unknown.txt', 0, [70], true)
    chunk(first.fileName, 0, [65], false)
    expect(result.current.bytesDownloaded).toBe(1)
    expect(connection.messages.at(-1)).toEqual({
      type: MessageType.ChunkAck,
      fileName: first.fileName,
      offset: 0,
      bytesReceived: 1,
    })
    chunk(first.fileName, 1, [66], true)

    await waitFor(() => expect(result.current.isDone).toBe(true))
    expect(connection.messages.at(-1)).toEqual({ type: MessageType.Done })
    expect(download.filename()).toBe(first.fileName)
    expect(download.output).toEqual([65, 66])
  })

  it('streams multiple files as a ZIP and requests each one in sequence', async () => {
    const { result, connection, receive, chunk, output, filename } =
      await openDownloader()
    act(() => connection.accept())
    receive({ type: MessageType.Info, files: [first, second] })
    act(result.current.startDownload)
    chunk(first.fileName, 0, [65, 66], true)
    expect(connection.messages.at(-1)).toEqual({
      type: MessageType.Start,
      fileName: second.fileName,
      offset: 0,
    })
    chunk(second.fileName, 0, [67], true)
    await waitFor(() => expect(result.current.isDone).toBe(true))
    expect(result.current.bytesDownloaded).toBe(3)
    expect(filename()).toMatch(/\.zip$/)
    expect(output.slice(0, 4)).toEqual([80, 75, 3, 4])
    expect(output.slice(-22, -18)).toEqual([80, 75, 5, 6])
  })

  it('stops the connection and resets download state', async () => {
    const { result, connection, receive } = await openDownloader()
    act(() => connection.accept())
    receive({
      type: MessageType.PasswordRequired,
      errorMessage: 'Incorrect password',
    })
    act(result.current.stopDownload)
    expect(connection.messages.at(-1)).toEqual({ type: MessageType.Pause })
    expect(connection.open).toBe(false)
    expect(result.current).toMatchObject({
      isConnected: false,
      isDownloading: false,
      errorMessage: null,
      bytesDownloaded: 0,
    })
    act(() => result.current.submitPassword('unused'))
    act(result.current.stopDownload)
  })

  it('reports browser and uploader errors and follows a report redirect', async () => {
    const { result, connection, receive, location, peer } =
      await openDownloader()
    act(() => peer.emit('error', new Error('Could not connect to peer id')))
    expect(result.current.errorMessage).toContain(
      'Could not connect to the uploader',
    )
    act(() => connection.accept())
    receive({ invalid: true })
    receive({ type: MessageType.Report })
    expect(location.href).toBe('/reported')
    receive({ type: MessageType.Error, error: 'Uploader refused transfer' })
    expect(result.current.errorMessage).toBe('Uploader refused transfer')
    expect(connection.open).toBe(false)
  })
})

it('reports transport errors on open connections and closes a connection that opens after cleanup', async () => {
  const active = await openDownloader()
  act(() => active.connection.accept())
  act(() => active.connection.emit('error', new Error('Transport failed')))
  expect(active.result.current.errorMessage).toBe('Transport failed')
  expect(active.connection.open).toBe(false)

  const pending = await openDownloader()
  pending.unmount()
  pending.connection.accept()
  expect(pending.connection.open).toBe(false)
})

it('writes and acknowledges chunks in offset order when they arrive out of order', async () => {
  const { result, connection, receive, chunk, output } = await openDownloader()
  const messages = () =>
    connection.messages.map((message) =>
      message.type === MessageType.ChunkAck
        ? `ack ${message.fileName} ${message.offset}`
        : message.type === MessageType.Start
          ? `start ${message.fileName}`
          : message.type,
    )
  act(() => connection.accept())
  receive({
    type: MessageType.Info,
    files: [{ ...first, size: 5 }, second],
  })
  act(result.current.startDownload)

  // The final chunk overtakes the two before it, and one of them is repeated.
  chunk(first.fileName, 4, [69], true)
  chunk(first.fileName, 2, [67, 68], false)
  chunk(first.fileName, 2, [67, 68], false)
  expect(result.current.bytesDownloaded).toBe(0)
  expect(messages()).toEqual([MessageType.RequestInfo, 'start a.txt'])

  chunk(first.fileName, 0, [65, 66], false)
  expect(result.current.bytesDownloaded).toBe(5)
  expect(messages().slice(2)).toEqual([
    'ack a.txt 0',
    'ack a.txt 2',
    'ack a.txt 4',
    'start /b.txt',
  ])

  chunk(second.fileName, 0, [70], true)
  await waitFor(() => expect(result.current.isDone).toBe(true))
  // The ZIP stores files uncompressed, so each appears verbatim.
  expect(Buffer.from(output).includes(Buffer.from('ABCDE'))).toBe(true)
})

it('rejects a premature final chunk instead of completing a truncated download', async () => {
  const { result, connection, receive, chunk, output, abortReasons } =
    await openDownloader()
  act(() => connection.accept())
  receive({ type: MessageType.Info, files: [{ ...first, size: 5 }] })
  act(result.current.startDownload)

  chunk(first.fileName, 0, [65, 66], false)
  await waitFor(() => expect(output).toEqual([65, 66]))
  chunk(first.fileName, 2, [67], true)

  await waitFor(() =>
    expect(result.current.errorMessage).toBe(
      'The download could not be completed.',
    ),
  )
  expect(result.current.isDone).toBe(false)
  expect(result.current.isDownloading).toBe(false)
  expect(connection.open).toBe(false)
  expect(output).toEqual([65, 66])
  expect(abortReasons).toEqual([
    new Error('Invalid chunk range or final marker'),
  ])
  expect(connection.messages.map(({ type }) => type)).not.toContain(
    MessageType.Done,
  )
})

it('aborts the ZIP destination when a later file contains an invalid final chunk', async () => {
  const { result, connection, receive, chunk, abortReasons } =
    await openDownloader()
  act(() => connection.accept())
  receive({
    type: MessageType.Info,
    files: [first, { ...second, size: 2 }],
  })
  act(result.current.startDownload)

  chunk(first.fileName, 0, [65, 66], true)
  expect(connection.messages.at(-1)).toEqual({
    type: MessageType.Start,
    fileName: second.fileName,
    offset: 0,
  })

  chunk(second.fileName, 0, [67], true)
  await waitFor(() =>
    expect(result.current.errorMessage).toBe(
      'The download could not be completed.',
    ),
  )
  expect(abortReasons).toEqual([
    new Error('Invalid chunk range or final marker'),
  ])
  expect(result.current.isDone).toBe(false)
  expect(result.current.bytesDownloaded).toBe(2)
  expect(connection.messages.map(({ type }) => type)).not.toContain(
    MessageType.Done,
  )
})
