import { EventEmitter } from 'node:events'
import type { PropsWithChildren } from 'react'
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { ViewTransitions } from 'next-view-transitions'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createPeerService,
  type DownloadTransport,
  type WebRTCPeer,
} from '../../src/components/WebRTCProvider'
import type { UploaderTransport } from '../../src/types'
import type { Message } from '../../src/messages'

export class TestDownloadConnection
  extends EventEmitter<{ data: [unknown]; close: []; open: []; error: [Error] }>
  implements DownloadTransport
{
  readonly peer = 'test-uploader'
  open = false
  readonly messages: Message[] = []

  send(message: Message) {
    this.messages.push(message)
  }

  accept() {
    this.open = true
    this.emit('open')
  }

  close() {
    this.open = false
    this.emit('close')
  }
}

export class TestPeer
  extends EventEmitter<{
    connection: [UploaderTransport]
    open: [string]
    error: [Error]
  }>
  implements WebRTCPeer
{
  destroyed = false

  constructor(
    public id = 'test-peer',
    readonly connection = new TestDownloadConnection(),
  ) {
    super()
  }

  connect() {
    return this.connection
  }

  destroy() {
    this.destroyed = true
  }
}

export function peerService(peer = new TestPeer()) {
  return createPeerService(
    async () => Response.json({ iceServers: [] }),
    () => peer,
  )
}

const router: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
}

export function TestRouter({ children }: PropsWithChildren) {
  return (
    <AppRouterContext.Provider value={router}>
      <ViewTransitions>{children}</ViewTransitions>
    </AppRouterContext.Provider>
  )
}

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export { QueryClientProvider }
