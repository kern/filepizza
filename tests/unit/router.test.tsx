import { renderToStaticMarkup } from 'react-dom/server'
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { getRouter } from '../../src/router'
import { Route as RootRoute, RootDocument } from '../../src/routes/__root'
import { TestRouter } from '../support/providers'

describe('router and root document', () => {
  it('creates a router with the file route tree and a 404 fallback', () => {
    const router = getRouter()
    expect(router.options.defaultViewTransition).toBe(true)
    expect(router.options.defaultNotFoundComponent).toBeDefined()
  })

  it('describes the document head', async () => {
    const head = (await RootRoute.options.head!({} as never)) as {
      meta: unknown[]
      links: unknown[]
    }
    expect(head.meta).toContainEqual({
      title: 'FilePizza • Your files, delivered.',
    })
    expect(head.links).toContainEqual({ rel: 'icon', href: '/favicon.ico' })
  })

  it('renders the application shell around the page', () => {
    const markup = renderToStaticMarkup(
      <TestRouter>
        <RootDocument>
          <p>Test page</p>
        </RootDocument>
      </TestRouter>,
    )
    expect(markup).toContain('<html lang="en"')
    expect(markup).toContain('<main><p>Test page</p></main>')
    expect(markup).toContain('Toggle mode')
  })

  it('renders the root route component around its outlet', async () => {
    const page = createRoute({
      getParentRoute: () => RootRoute,
      path: '/',
      component: () => <p>Routed page</p>,
    })
    const router = createRouter({
      routeTree: RootRoute.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    const markup = renderToStaticMarkup(<RouterProvider router={router} />)
    expect(markup).toContain('<main><p>Routed page</p></main>')
  })
})
