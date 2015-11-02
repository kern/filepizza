import Bootstrap from './Bootstrap'
import ErrorPage from './ErrorPage'
import FrozenHead from 'react-frozenhead'
import React from 'react'
import SupportStore from '../stores/SupportStore'
import { RouteHandler } from 'react-router'
import ga from 'react-google-analytics'

ga('create', 'UA-62785624-1', 'auto');
ga('send', 'pageview');

export default class App extends React.Component {

  constructor() {
    super()
    this.state = SupportStore.getState()

    this._onChange = () => {
      this.setState(SupportStore.getState())
    }
  }

  componentDidMount() {
    SupportStore.listen(this._onChange)
  }

  componentDidUnmount() {
    SupportStore.unlisten(this._onChange)
  }

  render() {
    return <html lang="en">
      <FrozenHead>

        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:url" content="http://file.pizza" />
        <meta property="og:title" content="FilePizza - Your files, delivered." />
        <meta property="og:description" content="Peer-to-peer file transfers in your web browser." />
        <meta property="og:image" content="http://file.pizza/images/fb.png" />
        <title>FilePizza - Your files, delivered.</title>

        <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Quicksand:300,400,700|Lobster+Two" />
        <link rel="stylesheet" href="/css" />

        <script src="//cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js" />
        <Bootstrap data={this.props.data} />
        <script src="/js" />

      </FrozenHead>

      <body>
        <div className="container">
          {this.state.isSupported
            ? <RouteHandler />
            : <ErrorPage />}
        </div>
        <footer className="footer">
          <p>Donations: <strong>1P7yFQAC3EmpvsB7K9s6bKPvXEP1LPoQnY</strong></p>

          <p className="byline">
            Cooked up by <a href="http://kern.io" target="_blank">Alex Kern</a> &amp; <a href="http://neeraj.io" target="_blank">Neeraj Baid</a> while eating <strong>Sliver</strong> @ UC Berkeley &middot; <a href="https://github.com/kern/filepizza#faq" target="_blank">FAQ</a> &middot; <a href="https://github.com/kern/filepizza" target="_blank">Fork us</a>
          </p>
        </footer>
        <script>FilePizza()</script>
        <ga.Initializer />
      </body>
    </html>
  }

}
