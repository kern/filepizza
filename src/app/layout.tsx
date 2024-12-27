import React from 'react'
import Footer from '../components/Footer'
import '../styles.css'
import { ThemeProvider } from '../components/ThemeProvider'
import { ModeToggle } from '../components/ModeToggle'
import FilePizzaQueryClientProvider from '../components/QueryClientProvider'

export const metadata = {
  title: 'FilePizza • Your files, delivered.',
  description: 'Peer-to-peer file transfers in your web browser.',
  charSet: 'utf-8',
  viewport: 'width=device-width, initial-scale=1',
  openGraph: {
    url: 'https://file.pizza',
    title: 'FilePizza • Your files, delivered.',
    description: 'Peer-to-peer file transfers in your web browser.',
    images: [{ url: 'https://file.pizza/images/fb.png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="monetization" content="$twitter.xrptipbot.com/kernio" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FilePizzaQueryClientProvider>
            <main>{children}</main>
            <Footer />
            <ModeToggle />
          </FilePizzaQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
