import type { PropsWithChildren } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createPeerService,
  type DownloadTransport,
  type WebRTCPeer,
} from '../../src/components/WebRTCProvider'
import type { UploaderTransport } from '../../src/types'
import type { Message } from '../../src/messages'

type Listener<Args extends unknown[]> = (...args: Args) => void

// A minimal typed emitter with the `on`/`off`/`once`/`emit` shape the app's
// transport interfaces declare. Node's EventEmitter typings changed in
// @types/node 26 in a way that no longer lines up with them.
class TypedEmitter<Events extends Record<string, unknown[]>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never[]>>>()

  on<E extends keyof Events>(event: E, listener: Listener<Events[E]>): this {
    const set = this.listeners.get(event) ?? new Set()
    set.add(listener as unknown as Listener<unknown[]>)
    this.listeners.set(event, set)
    return this
  }

  off<E extends keyof Events>(event: E, listener: Listener<Events[E]>): this {
    this.listeners
      .get(event)
      ?.delete(listener as unknown as Listener<unknown[]>)
    return this
  }

  once<E extends keyof Events>(event: E, listener: Listener<Events[E]>): this {
    const wrapper = (...args: Events[E]) => {
      this.off(event, wrapper)
      ;(listener as unknown as Listener<Events[E]>)(...args)
    }
    return this.on(event, wrapper)
  }

  emit<E extends keyof Events>(event: E, ...args: Events[E]): boolean {
    const set = this.listeners.get(event)
    for (const listener of [...(set ?? [])]) {
      ;(listener as unknown as Listener<Events[E]>)(...args)
    }
    return Boolean(set?.size)
  }
}

export class TestDownloadConnection
  extends TypedEmitter<{ data: [unknown]; close: []; open: []; error: [Error] }>
  implements DownloadTransport
{
  readonly peer = 'test-uploader'
  open = false
  peerConnection?: RTCPeerConnection
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
  extends TypedEmitter<{
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

export function TestRouter({ children }: PropsWithChildren) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{children}</>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return (
    <RouterContextProvider router={router}>{children}</RouterContextProvider>
  )
}

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export { QueryClientProvider }
