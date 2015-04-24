import FrozenHead from 'react-frozenhead'
import React from 'react'
import { RouteHandler } from 'react-router'

export default class App extends React.Component {

  render() {
    return <html lang="en" data-bootstrap={this.props.data}>
      <FrozenHead>

        <meta charSet="utf-8" />
        <meta property="og:url" content="file.pizza" />
        <meta property="og:title" content="FilePizza - Send Files, Easily" />
        <meta property="og:image" content="/images/fb.png" />
        <title>FilePizza - Send Files, Easily</title>

        <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Quicksand:300,400,700" />
        <link rel="stylesheet" href="/css" />

        <script src="/js" />

      </FrozenHead>

      <body>
        <RouteHandler />
        <script>FilePizza()</script>
      </body>
    </html>
  }

}
