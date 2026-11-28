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
- A [command line client](#command-line-client) for sending and receiving from a terminal.

## Development

Requires [Node.js](https://nodejs.org/) 24 or newer (CI and the Docker image use 26) and [pnpm](https://pnpm.io/).

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

## Command line client

`filepizza` sends and receives files from a terminal, and works with the website: a link from `filepizza send` opens in any browser, and `filepizza receive` takes a link made on the website. It is written in TypeScript and compiled with [Bun](https://bun.sh) into one executable.

```
$ pnpm install
$ pnpm build:cli                   # needs Bun; writes dist/filepizza
$ ./dist/filepizza send photo.jpg notes/
Share link: https://file.pizza/download/abcd1234
$ ./dist/filepizza receive https://file.pizza/download/abcd1234
```

- `send <file or folder>...` shares files, and folders with everything in them, until you press Ctrl-C. `--once` exits after one download has finished, which suits scripts.
- `receive <link>` saves the files into the current folder, or the one given with `--output`. It also takes just the code from the end of a link, with `--server` naming the site. It will not overwrite existing files unless you pass `--force`.
- `--server <url>` picks the FilePizza server (default `https://file.pizza`, or `$FILEPIZZA_SERVER`), so it works with a [self-hosted](#self-hosting) one.
- `--password <text>` protects a share, or answers its prompt. Set `$FILEPIZZA_PASSWORD` instead where you can: command line arguments are visible to other users of the machine.

Like the website, it needs the sender to stay online while the transfer runs, and the files go directly between the two machines. The executable is built for the machine that builds it, because its WebRTC library ships a native addon for each platform. During development, `pnpm cli send ...` runs it without compiling.

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
- `TURN_HOST` – Hostname or IP address of the TURN server, as visitors' browsers reach it. Defaults to the host the visitor used to reach FilePizza (honouring `X-Forwarded-Host`), which is right when coturn runs on the same machine, and falls back to `127.0.0.1` if that can't be determined.
- `TURN_PORT` – Port of the TURN server. Defaults to `3478`.
- `TURNS_PORT` – Port of the TURN-over-TLS server. Defaults to `5349`.
- `TURN_TRANSPORT` – Set to `udp` or `tcp` to restrict the TURN URLs to that transport. By default no transport is requested.
- `TURN_SECRET` – Shared secret for coturn's `use-auth-secret` mode (`static-auth-secret`). When set, FilePizza hands out time-limited credentials derived from it and doesn't write them to Redis. When unset, credentials are stored in Redis for coturn's `redis-userdb`.
- `TURN_REALM` – Realm used when generating TURN credentials. Defaults to `file.pizza`.
- `STUN_SERVER` – STUN server URL to use when `COTURN_ENABLED` is disabled. Defaults to `stun:stun.l.google.com:19302`.
- `PEERJS_HOST` – Hostname or IP address to the self-hosted PeerJS server. Defaults to `0.peerjs.com`.
- `PEERJS_PORT` – Port of the self-hosted PeerJS server. Defaults to PeerJS's own default (`443`).
- `PEERJS_PATH` – Path to self-hosted PeerJS server. Defaults to `/`.

## Self-hosting

`docker-compose.production.yml` runs FilePizza with Redis and a coturn TURN server. Out of the box it works when visitors reach FilePizza at the same address as coturn. The server hands the ICE and signalling settings to each visitor's browser, so anything that points at "localhost" would point at the visitor's own computer.

1. **Open the TURN ports** on your firewall: `3478` (TCP and UDP), `5349` (TCP and UDP) and the relay range `60000-60128` (UDP).

2. **Serve it over HTTPS** so downloads can stream to disk. See the FAQ below.

3. **Optional settings** go in a `.env` file next to the compose file (it's read if present):

   ```
   # Only if coturn is reachable at a different address than FilePizza itself.
   TURN_HOST=turn.example.com
   # Realm shared by FilePizza and coturn. Defaults to file.pizza.
   TURN_REALM=turn.example.com
   ```

   `TURN_HOST` defaults to the address the visitor used to reach the site, so a single-machine setup needs nothing. If you put coturn on another host, set it. If peers show as connected but nothing transfers when either side is behind a NAT, check `TURN_HOST` first.

4. **Signalling server:** by default the browsers use the public PeerJS cloud (`0.peerjs.com`) to find each other. To run your own, start `pnpm start:peerjs` (`bin/peerjs.js`) and set `PEERJS_HOST`, `PEERJS_PORT` and `PEERJS_PATH` to its address.

If you don't need TURN, leave `COTURN_ENABLED` unset: FilePizza then uses only the STUN server (`STUN_SERVER`), which works for peers that can reach each other directly, for example on the same network.

## FAQ

**How are my files sent?** Your files are sent directly from your browser to the downloader's browser. They never pass through our servers. FilePizza uses WebRTC to send files. This requires that the uploader leave their browser window open until the transfer is complete.

**Can multiple people download my file at once?** Yes! Just send them your short or long URL.

**How big can my files be?** As big as your browser can handle.

**Why is my download held in memory when I self-host?** Streaming downloads (writing straight to disk, so very large files work) rely on a service worker, which browsers only allow on secure origins: `https://` or `http://localhost`. When FilePizza is served from a plain-HTTP address such as a private IP (`http://192.168.x.x`), or from Safari, the downloader's browser buffers the whole file in memory and saves it at the end, so big files can fail. Serve your instance over HTTPS (for example behind a reverse proxy with a certificate) to get streaming downloads.

**What happens when I close my browser?** Keep your browser page open until every recipient finishes downloading. After you close it, the share link stops working. Recipients can still use any files they downloaded in full.

**Why doesn't it work with iCloud Private Relay or a VPN?** WebRTC needs a direct (UDP) path between the two browsers, or a relay it can reach. Private Relay and many VPNs route Safari's traffic through their own proxies, which can stop that path from forming, so peers never connect. If a transfer stalls on "connecting", turn Private Relay or the VPN off for the page (on iOS: Settings → your name → iCloud → Private Relay) and try again. If you self-host, running coturn with TURN over TCP (`TURN_TRANSPORT=tcp`) may give these networks a relay they can use.

**Why does my download fail with a download manager, or show a 404?** FilePizza streams the file from the other browser straight into your download, through a link that only exists inside your browser. A download manager or accelerator that takes over the download and fetches that link itself can't get the file, and shows "404 Not Found". Turn the download manager off for this site and try again. Some browsers, for example when set to ask where to save each file, request the link a second time; for downloads up to 128 MB FilePizza keeps what it has sent so the second request still works, but a larger download can only be requested once.

**Are my files encrypted?** Yes, all WebRTC communications are automatically encrypted using public-key cryptography because of DTLS. You can add an optional password to your upload for an extra layer of security.

## License & Acknowledgements

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/main/LICENSE). A huge thanks to [iblowyourdesign](https://dribbble.com/iblowyourdesign) for the pizza illustration.
