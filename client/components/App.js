import FrozenHead from 'react-frozenhead'
import React from 'react'
import { RouteHandler } from 'react-router'

export default class App extends React.Component {

  render() {
    return <html lang="en" data-bootstrap={this.props.data}>
      <FrozenHead>
        <meta charSet="utf-8" />
        <title>WebDrop - Send Files, Easily</title>
        <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Quicksand:300,400,700" />
        <link rel="stylesheet" href="/index.css" />
      </FrozenHead>

      <body>
        <div className="container">
          <RouteHandler />
          <script src="/app.js" />
        </div>
      </body>
    </html>
  }

}
