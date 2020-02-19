<a href="https://xkcd.com/949/"><img src="http://imgs.xkcd.com/comics/file_transfer.png" alt="XKCD 949" width="30%" align="right" /></a> <img src="src/static/images/wordmark.png" alt="FilePizza wordmark" width="50%" /> <h3>Peer-to-peer file transfers in your browser</h3>

*Cooked up by [Alex Kern](https://kern.io) & [Neeraj Baid](http://neeraj.io) while eating Sliver @ UC Berkeley.*

Using [WebRTC](http://www.webrtc.org), FilePizza eliminates the initial upload step required by other web-based file sharing services. When senders initialize a transfer, they receive a "tempalink" they can distribute to recipients. Upon visiting this link, recipients' browsers connect directly to the sender’s browser and may begin downloading the selected file. Because data is never stored in an intermediary server, the transfer is fast, private, and secure.

A hosted instance of FilePizza is available at [file.pizza](https://file.pizza).

## Requirements

* node `0.12.x`
* npm `2.x.x`

## Installation

The recommended way to deploy FilePizza is as a [Docker container](https://hub.docker.com/r/kern/filepizza). WebRTC only works over HTTPS, so you'll either have to get a signed HTTPS key/certificate from a CA such as [Let's Encrypt](https://letsencrypt.org/getting-started/) or generate your own [self-signed pair](https://devcenter.heroku.com/articles/ssl-certificate-self) and trust it. Then, to run FilePizza (with HTTPS termination):

    $ docker run \
        -p 8080:8080 -e PORT=8080 \
        -e HTTPS_KEY=/config/server.key \
        -e HTTPS_CERT=/config/server.crt \
        -v mylocalpath:/config \
        -it kern/filepizza:master

You can specify your own ICE STUN/TURN servers for better connectivity behind NATs by passing a JSON encoding of the array via env var `ICE_SERVERS`. Alternatively, if you'd like to use [Twilio's STUN/TURN service](https://www.twilio.com/stun-turn), you can specify your SID and token using the `TWILIO_SID` and `TWILIO_TOKEN` environment variables, respectively.

You can specify your own Webtorrent tracker(s) using the `WEBTORRENT_TRACKERS` environment variable, comma-delimited.

If you want to use [Google Analytics](https://marketingplatform.google.com/about/analytics/), you can specify your UA code using the `GA_ACCESS_TOKEN="UA-00000000-1"` environment variable.

## Development

    $ git clone https://github.com/kern/filepizza.git
    $ npm install
    $ npm run-script build
    $ npm start

FilePizza is an isomorphic React application which uses the Flux application architecture. ES6 features are used liberally and compiled using Babel. Views are rendered on the server, store data is serialized and sent to the client, which then picks up where the server left off.

Both client and server JavaScript files can be found in `lib/`. `lib/server.js` and `lib/client.js` are the server and client entrypoints, respectively. `lib/components/`, `lib/stores/`, and `lib/actions/` contain the corresponding Flux modules, implemented using [alt](https://github.com/goatslacker/alt). `lib/routes.js` serves as the isomorphic routes file using [react-router](https://github.com/rackt/react-router).

Client-side JavaScript and CSS are compiled using webpack and are available at `/app.js`.

## FAQ

**Where are my files sent?** Your files never touch our server. Instead, they are sent directly from the uploader's browser to the downloader's browser using WebTorrent and WebRTC. This requires that the uploader leave their browser window open until the transfer is complete.

**Can multiple people download my file at once?** Yes! Just send them your tempalink.

**How big can my files be?** Chrome has issues supporting files >500 MB. Firefox does not have any issues with large files, however.

**What happens when I close my browser?** The tempalink is invalidated. If a downloader has completed the transfer, that downloader will continue to seed to incomplete downloaders, but no new downloads may be initiated.

**Are my files encrypted?** Yes, all WebRTC communications are automatically encrypted using public-key cryptography.

**My files are sending slowly!** Transfer speed is dependent on your network connection.

## Troubleshooting

If you receive a `Error: EMFILE, too many open files` error when running `npm
start` on a Mac, this is a result of Browserify's compilation step opening up a
large number of npm modules all at once. You'll have to increase the maximum
number of open files allowed on your system:

    $ sysctl -w kern.maxfiles=20480

## License & Acknowledgements

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/master/LICENSE). A huge thanks to [WebTorrent](https://github.com/feross/webtorrent) which we use for the file transfers under the hood, and to [iblowyourdesign](https://dribbble.com/iblowyourdesign) for the pizza illustration.
