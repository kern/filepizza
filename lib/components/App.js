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
          <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
            <input type="hidden" name="cmd" value="_s-xclick" />
            <input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----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-----END PKCS7-----" />
            <button type="submit" className="donate-button">donate via PayPal</button>
            <p>BTC: <strong>1P7yFQAC3EmpvsB7K9s6bKPvXEP1LPoQnY</strong></p>
          </form>

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
