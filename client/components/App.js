import FrozenHead from 'react-frozenhead';
import React from 'react';
import { RouteHandler } from 'react-router';

export default class App extends React.Component {

  render() {
    return <html lang="en" data-bootstrap={this.props.data}>
      <FrozenHead>
        <meta charSet="utf-8" />
        <title>WebDrop - Send Files, Easily</title>

        <link rel="stylesheet" href="/index.css" />
        <script src="/app.js" />
      </FrozenHead>

      <body>
        <RouteHandler />
      </body>
    </html>;
  }

}
