![wordmark](static/images/wordmark.png)

### Free peer-to-peer file transfers in your browser

Cooked up by [Alex Kern](http://kern.io) & [Neeraj Baid](http://neeraj.io) while eating *Sliver* @ UC Berkeley.

[![XKCD 949](http://imgs.xkcd.com/comics/file_transfer.png)](https://xkcd.com/949/)

## Overview

FilePizza enables fast and private peer-to-peer file transfers in your web browser.

By using [WebRTC](http://www.webrtc.org), FilePizza eliminates the initial upload traditionally required when sharing files via file sharing services (e.g. Dropbox). Instead of transmitting files through an intermediary server, the sender initializes a transfer and receives a "tempalink" they can distribute. When recipients click on this link, they connect directly to the sender’s browser to complete the download. Because the file never touches the server, the transfer is fast, private, and secure. For larger files, this is an especially big deal.

A hosted instance of FilePizza is available at [file.pizza](http://file.pizza).

## Requirements

* node `0.12.x`
* npm `2.x.x`

## Installation

    $ npm install filepizza -g
    $ filepizza

You can specify the port that FilePizza's HTTP server uses by setting the `PORT` environment variable (default 3000):

    $ env PORT=8080 filepizza

If you'd like to use [Twilio's STUN/TURN service](https://www.twilio.com/stun-turn) for better connectivity behind NATs, you can specify your SID and token like so:

    $ env TWILIO_SID=abcdef TWILIO_TOKEN=ghijkl filepizza

## Development

    $ git clone https://github.com/kern/filepizza.git
    $ npm install
    $ npm start

FilePizza is an isomorphic React application which uses the Flux application architecture. ES6 features are used liberally and compiled using Babel. Views are rendered on the server, store data is serialized and sent to the client, which then picks up where the server left off.

Both client and server JavaScript files can be found in `lib/`. `lib/server.js` and `lib/client.js` are the server and client entrypoints, respectively. `lib/components/`, `lib/stores/`, and `lib/actions/` contain the corresponding Flux modules, implemented using [alt](https://github.com/goatslacker/alt). `lib/routes.js` serves as the isomorphic routes file using [react-router](https://github.com/rackt/react-router).

Stylesheets are automatically compiled using Stylus and are available at `/css`. Client-side JavaScript is compiled using Browserify and is available at `/js`.

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

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/master/LICENSE). A huge thanks to [WebTorrent](https://github.com/feross/webtorrent) which we use for the file transfers under the hood.
