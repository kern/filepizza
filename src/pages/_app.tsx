import React from 'react'
import { AppProps } from 'next/app'
import Head from 'next/head'
import Footer from '../components/Footer'
import { ChakraProvider, extendTheme, Container } from '@chakra-ui/react'
import '../styles.css'

const theme = extendTheme({
  colors: {
    brand: {},
  },
  textStyles: {
    description: {
      color: 'gray.500',
      fontSize: '18px',
      lineHeight: '20px',
      letterSpacing: '2%',
    },
    descriptionSmall: {
      color: 'gray.500',
      fontSize: '12px',
      lineHeight: '20px',
      letterSpacing: '2%',
    },
    descriptionError: {
      color: 'red.500',
      fontSize: '18px',
      lineHeight: '20px',
      letterSpacing: '2%',
    },
    fileName: {
      color: 'gray.900',
      fontSize: '12px',
      lineHeight: '20px',
      fontFamily: 'monospace',
    },
    footer: {
      fontSize: '12px',
      lineHeight: '20px',
      letterSpacing: '2%',
    },
    footerLink: {
      color: 'gray.500',
    },
    h2: {
      fontSize: ['36px', '48px'],
      fontWeight: 'semibold',
      lineHeight: '110%',
      letterSpacing: '-1%',
    },
  },
})

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

    <ChakraProvider theme={theme}>
      <Container flex="auto">
        <Component {...pageProps} />
      </Container>

      <Container flex="none">
        <Footer />
      </Container>
    </ChakraProvider>
  </>
)

export default App
