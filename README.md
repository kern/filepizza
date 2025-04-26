<a href="https://xkcd.com/949/"><img src="http://imgs.xkcd.com/comics/file_transfer.png" alt="XKCD 949" width="30%" align="right" /></a> <img src="public/images/wordmark.png" alt="FilePizza wordmark" width="50%" /> <h3>Peer-to-peer file transfers in your browser *deployed with Cloudflare*</h3>

*Cooked up by [Alex Kern](https://kern.io) & [Neeraj Baid](https://github.com/neerajbaid) while eating Sliver @ UC Berkeley.*

*Made deployable by [Fares Abawi](https://abawi.me) using Cloudflare Tunnel.*

Using [WebRTC](http://www.webrtc.org), FilePizza eliminates the initial upload step required by other web-based file sharing services. Because data is never stored in an intermediary server, the transfer is fast, private, and secure.

A hosted instance of the Cloudflare deployed FilePizza is available at [filepizza.emaily.re](https://filepizza.emaily.re).

## API requirements

To use the FilePizza in your own apps, we created an unofficial [filepizza-client](https://github.com/TeXlyre/filepizza-client) API which is designed to work with this FilePizza fork. 

You'd first need to install this package [locally](#running-with-docker) or [remotely (deployed with Cloudflare Tunnel)](#deployment-with-cloudflare-tunnel). 
The [filepizza-client](https://github.com/TeXlyre/filepizza-client) API runs by default on `http://localhost:8081` which is automatically configured in the `docker-compose.yml`. 

For hosting the API and this package remotely, you'd have to modify the `API_ORIGINS` variable in the `.env` file (a copy of the provided `envfile`) to include the domain or sub-domain where the API is hosted.

## What's new with FilePizza v2

* A new UI with dark mode support, now built on modern browser technologies.
* Works on most mobile browsers, including Mobile Safari.
* Transfers are now directly from the uploader to the downloader's browser (WebRTC without WebTorrent) with faster handshakes.
* Uploaders can monitor the progress of the transfer and stop it if they want.
* Better security and safety measures with password protection and reporting.
* Support for uploading multiple files at once, which downloaders receive as a zip file.
* Streaming downloads with a Service Worker.
* Out-of-process storage of server state using Redis.

## Development

```
$ git clone https://github.com/kern/filepizza.git
$ pnpm install
$ pnpm dev
$ pnpm build
$ pnpm start
```

## Running with Docker

```
$ pnpm docker:local:build
$ pnpm docker:local:up
$ pnpm docker:local:down
```

## Deployment with Cloudflare Tunnel

1. Create a Cloudflare account and add your domain.
2. Get the Global API token from Cloudflare.
3. Copy the envfile to `.env` and fill in the required values including the `CLOUDFLARE_API_KEY` and `HOST_DOMAIN` (the link to your cloudflared domain or sub-domain).
4. Run the following command to build the docker file:
   ```bash
   pnpm run docker:build
   ```
5. Run the following command to start the cloudflare deployment:
   ```bash
   pnpm run deploy:full
   ```
6. On the first usage, you will be directed to the Cloudflare login page. After logging in, you will have to authorize the domain you specified in the `.env` file `HOST_DOMAIN`.
7. After the authorization, you will be redirected to the FilePizza app. You can now use the app with your custom domain.

## Stack

* Next.js
* Tailwind
* TypeScript
* React
* PeerJS for WebRTC
* View Transitions
* Redis (optional)

## FAQ

**How are my files sent?** Your files are sent directly from your browser to the downloader's browser. They never pass through our servers. FilePizza uses WebRTC to send files. This requires that the uploader leave their browser window open until the transfer is complete.

**Can multiple people download my file at once?** Yes! Just send them your short or long URL.

**How big can my files be?** As big as your browser can handle.

**What happens when I close my browser?** The URLs for your files will no longer work. If a downloader has completed the transfer, that downloader will continue to seed to incomplete downloaders, but no new downloads may be initiated.

**Are my files encrypted?** Yes, all WebRTC communications are automatically encrypted using public-key cryptography because of DTLS. You can add an optional password to your upload for an extra layer of security.

## License & Acknowledgements

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/main/LICENSE). A huge thanks to [iblowyourdesign](https://dribbble.com/iblowyourdesign) for the pizza illustration.
