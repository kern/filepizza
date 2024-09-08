import React from 'react'
import { AppProps } from 'next/app'
import Head from 'next/head'
import Footer from '../components/Footer'
import '../styles.css'

const App: React.FC<AppProps> = ({ Component, pageProps }: AppProps) => (
  <>
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="monetization" content="$twitter.xrptipbot.com/kernio" />
      <meta property="og:url" content="https://file.pizza" />
      <meta property="og:title" content="FilePizza • Your files, delivered." />
      <meta
        property="og:description"
        content="Peer-to-peer file transfers in your web browser."
      />
      <meta property="og:image" content="https://file.pizza/images/fb.png" />
      <title>FilePizza • Your files, delivered.</title>
      <meta property="og:title" content="FilePizza" key="title" />
    </Head>

    <main>
      <Component {...pageProps} />
    </main>

    <Footer />
  </>
)

export default App
