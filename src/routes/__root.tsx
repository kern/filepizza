import React from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import Footer from '../components/Footer'
import stylesHref from '../styles.css?url'
import { ThemeProvider } from '../components/ThemeProvider'
import { ModeToggle } from '../components/ModeToggle'
import FilePizzaQueryClientProvider from '../components/QueryClientProvider'

const title = 'FilePizza • Your files, delivered.'
const description = 'Peer-to-peer file transfers in your web browser.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      { title },
      { name: 'description', content: description },
      { property: 'og:url', content: 'https://file.pizza' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: 'https://file.pizza/images/fb.png' },
    ],
    links: [
      { rel: 'stylesheet', href: stylesHref },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootComponent,
})

export function RootDocument({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FilePizzaQueryClientProvider>
            <main>{children}</main>
            <Footer />
            <ModeToggle />
          </FilePizzaQueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent(): React.ReactElement {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}
