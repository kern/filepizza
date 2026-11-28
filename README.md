<a href="https://xkcd.com/949/"><img src="http://imgs.xkcd.com/comics/file_transfer.png" alt="XKCD 949" width="30%" align="right" /></a> <img src="public/images/wordmark.png" alt="FilePizza wordmark" width="50%" /> <h3>Peer-to-peer file transfers in your browser</h3>

_Cooked up by [Alex Kern](https://kern.io) & [Neeraj Baid](https://github.com/neerajbaid) while eating Sliver @ UC Berkeley._

Using [WebRTC](http://www.webrtc.org), FilePizza eliminates the initial upload step required by other web-based file sharing services. Because data is never stored in an intermediary server, the transfer is fast, private, and secure.

A hosted instance of FilePizza is available at [file.pizza](https://file.pizza).

## What's new with FilePizza v2

- A new UI with dark mode support, now built on modern browser technologies.
- Works on most mobile browsers, including Mobile Safari.
- Transfers are now directly from the uploader to the downloader's browser (WebRTC without WebTorrent) with faster handshakes.
- Uploaders can monitor the progress of the transfer and stop it if they want.
- Better security and safety measures with password protection and reporting.
- Support for uploading multiple files at once, which downloaders receive as a zip file.
- Streaming downloads with a Service Worker.
- Out-of-process storage of server state using Redis.

## Development

Requires [Node.js](https://nodejs.org/) 24 or newer and [pnpm](https://pnpm.io/).

```
$ git clone https://github.com/kern/filepizza.git
$ pnpm install
$ pnpm dev        # development server on http://localhost:3000
$ pnpm build      # production build into .output/
$ pnpm start      # run the production build
```

Run `pnpm lint:check`, `pnpm format:check`, `pnpm type:check`, `pnpm test:coverage` and `pnpm test:e2e` (after `pnpm build`) before opening a pull request, or `pnpm ci` to run everything. See [AGENTS.md](AGENTS.md) for more on the project layout.

## Running with Docker

```
$ pnpm docker:build
$ pnpm docker:up
$ pnpm docker:down
```

## Stack

- [TanStack Start](https://tanstack.com/start) (TanStack Router, Vite and Nitro)
- React 19 and Tailwind CSS v4
- TypeScript
- PeerJS for WebRTC
- View Transitions
- Oxlint and Oxfmt for linting and formatting
- Vitest and Playwright for tests
- Redis (optional)

## Configuration

The server can be customized with the following environment variables:

- `PORT` – Port the production server listens on. Defaults to `3000`.
- `REDIS_URL` – Connection string for a Redis instance used to store channel metadata. If not set, FilePizza falls back to in-memory storage.
- `COTURN_ENABLED` – When set to `true`, enables TURN support for connecting peers behind NAT.
- `TURN_HOST` – Hostname or IP address of the TURN server. Defaults to `127.0.0.1`.
- `TURN_PORT` – Port of the TURN server. Defaults to `3478`.
- `TURNS_PORT` – Port of the TURN-over-TLS server. Defaults to `5349`.
- `TURN_TRANSPORT` – Set to `udp` or `tcp` to restrict the TURN URLs to that transport. By default no transport is requested.
- `TURN_SECRET` – Shared secret for coturn's `use-auth-secret` mode (`static-auth-secret`). When set, FilePizza hands out time-limited credentials derived from it and doesn't write them to Redis. When unset, credentials are stored in Redis for coturn's `redis-userdb`.
- `TURN_REALM` – Realm used when generating TURN credentials. Defaults to `file.pizza`.
- `STUN_SERVER` – STUN server URL to use when `COTURN_ENABLED` is disabled. Defaults to `stun:stun.l.google.com:19302`.
- `PEERJS_HOST` – Hostname or IP address to the self-hosted PeerJS server. Defaults to `0.peerjs.com`.
- `PEERJS_PORT` – Port of the self-hosted PeerJS server. Defaults to PeerJS's own default (`443`).
- `PEERJS_PATH` – Path to self-hosted PeerJS server. Defaults to `/`.

## FAQ

**How are my files sent?** Your files are sent directly from your browser to the downloader's browser. They never pass through our servers. FilePizza uses WebRTC to send files. This requires that the uploader leave their browser window open until the transfer is complete.

**Can multiple people download my file at once?** Yes! Just send them your short or long URL.

**How big can my files be?** As big as your browser can handle.

**What happens when I close my browser?** Keep your browser page open until every recipient finishes downloading. After you close it, the share link stops working. Recipients can still use any files they downloaded in full.

**Are my files encrypted?** Yes, all WebRTC communications are automatically encrypted using public-key cryptography because of DTLS. You can add an optional password to your upload for an extra layer of security.

## License & Acknowledgements

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/main/LICENSE). A huge thanks to [iblowyourdesign](https://dribbble.com/iblowyourdesign) for the pizza illustration.
