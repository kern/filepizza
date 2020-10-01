import Bootstrap from "./Bootstrap";
import ErrorPage from "./ErrorPage";
import FrozenHead from "react-frozenhead";
import React from "react";
import SupportStore from "../stores/SupportStore";
import SupportActions from "../actions/SupportActions";
import { RouteHandler } from "react-router";
import ga from "react-google-analytics";

if (process.env.GA_ACCESS_TOKEN) {
  ga("create", process.env.GA_ACCESS_TOKEN, "auto");
  ga("send", "pageview");
}

export default class App extends React.Component {
  constructor() {
    super();
    this.state = SupportStore.getState();

    this._onChange = () => {
      this.setState(SupportStore.getState());
    };
  }

  toggleTheme(e) {
    e.preventDefault()

    if (this.state.theme == "dark") {
      SupportActions.themeChange("light")
    } else {
      SupportActions.themeChange("dark")
    }
  }

  componentDidMount() {
    SupportStore.listen(this._onChange);
  }

  componentWillUnmount() {
    SupportStore.unlisten(this._onChange);
  }

  render() {
    return (
      <html lang="en">
        <FrozenHead>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="monetization" content="$twitter.xrptipbot.com/kernio" />
          <meta property="og:url" content="https://file.pizza" />
          <meta
            property="og:title"
            content="FilePizza - Your files, delivered."
          />
          <meta
            property="og:description"
            content="Peer-to-peer file transfers in your web browser."
          />
          <meta
            property="og:image"
            content="https://file.pizza/images/fb.png"
          />
          <title>FilePizza - Your files, delivered.</title>
          <link rel="stylesheet" href="/fonts/fonts.css" />
          <Bootstrap data={this.props.data} />
          <script src="https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js" />
          <script src="/app.js" />
        </FrozenHead>

        <body data-theme={this.state.theme}>
          <div className="container">
            {this.state.isSupported ? <RouteHandler /> : <ErrorPage />}
          </div>
          <footer className="footer">
            <p>
              <strong>Like FilePizza?</strong> Support its development! <a href="https://commerce.coinbase.com/checkout/247b6ffe-fb4e-47a8-9a76-e6b7ef83ea22" className="donate-button">donate</a>
            </p>

            <p className="byline">
              Cooked up by{" "}
              <a href="http://kern.io" target="_blank">
                Alex Kern
              </a>{" "}
              &amp;{" "}
              <a href="http://neeraj.io" target="_blank">
                Neeraj Baid
              </a>{" "}
              while eating <strong>Sliver</strong> @ UC Berkeley &middot;{" "}
              <a href="https://github.com/kern/filepizza#faq" target="_blank">
                FAQ
              </a>{" "}
              &middot;{" "}
              <a href="https://github.com/kern/filepizza" target="_blank">
                Fork us
              </a>{" "}
              &middot;{" "}
              <a href="#" onClick={this.toggleTheme.bind(this)}>
                {this.state.theme == "dark" ? "Toggle light theme 🌝" : "Toggle dark theme 🌚"}
              </a>
            </p>
          </footer>
          <script>FilePizza()</script>
          { process.env.GA_ACCESS_TOKEN ? <ga.Initializer /> : <div></div> }
        </body>
      </html>
    );
  }
}
