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

### Deployment with Cloudflare Tunnel

You can deploy FilePizza using Cloudflare Tunnel for easy hosting without port forwarding or complex network configuration.

#### Prerequisites

1. A Cloudflare account with your domain added
2. Cloudflare Global API token
3. Docker and Docker Compose installed

#### Setup

1. **Get your Cloudflare API token**: Go to Cloudflare dashboard → My Profile → API Tokens → Global API Key

2. **Configure environment**: Copy the `envfile` to `.env` and fill in your details:
   ```bash
   cp envfile .env
   # Edit .env with your values
   ```

3. **Build and deploy**:
   ```bash
   npm run docker:build
   npm run deploy:full
   ```

4. **Manual deployment** (if you prefer):
   ```bash
   # Build the Docker image
   npm run docker:build
   
   # Start the application stack
   npm run docker:up
   
   # Set up and start Cloudflare tunnel
   npm run tunnel:setup
   npm run tunnel:start
   ```

#### Usage

Once deployed, your FilePizza instance will be available at `https://your-domain.com`. Users can access the web interface to share files peer-to-peer.

#### CORS Configuration

FilePizza supports CORS configuration through the `API_ORIGINS` environment variable for external API access:

```bash
# Allow specific origins
API_ORIGINS=https://myapp.com,https://myapp.dev,https://localhost:3000

# Allow all origins (not recommended for production)
API_ORIGINS=*

# No external API access (if not specified)
# API_ORIGINS=
```

**Important**: Always specify the exact origins that should be allowed to access your FilePizza API in production environments for security.

#### Environment Variables

Create a `.env` file based on `envfile`:

- `HOST_DOMAIN`: Your domain/subdomain for FilePizza
- `CLOUDFLARE_API_KEY`: Your Cloudflare Global API token
- `API_ORIGINS`: Comma-separated list of allowed origins for CORS
- `EXTERNAL_IP`: Your external IP (for TURN server)
- `TURN_SECRET`: Secret for TURN server authentication
- `NODE_ENV`: Environment (production/development)

#### Manual Tunnel Setup

If you need to set up the tunnel manually:

```bash
./scripts/run_filepizza_cloudflare_tunnel.sh "your-api-key" "your-domain.com"
```

## Stack

* Next.js
* Tailwind
* TypeScript
* React
* PeerJS for WebRTC
* View Transitions
* Redis (optional)

## Configuration

The server can be customized with the following environment variables:

- `REDIS_URL` – Connection string for a Redis instance used to store channel metadata. If not set, FilePizza falls back to in-memory storage.
- `COTURN_ENABLED` – When set to `true`, enables TURN support for connecting peers behind NAT.
- `TURN_HOST` – Hostname or IP address of the TURN server. Defaults to `127.0.0.1`.
- `TURN_REALM` – Realm used when generating TURN credentials. Defaults to `file.pizza`.
- `STUN_SERVER` – STUN server URL to use when `COTURN_ENABLED` is disabled. Defaults to `stun:stun.l.google.com:19302`.

## FAQ

**How are my files sent?** Your files are sent directly from your browser to the downloader's browser. They never pass through our servers. FilePizza uses WebRTC to send files. This requires that the uploader leave their browser window open until the transfer is complete.

**Can multiple people download my file at once?** Yes! Just send them your short or long URL.

**How big can my files be?** As big as your browser can handle.

**What happens when I close my browser?** The URLs for your files will no longer work. If a downloader has completed the transfer, that downloader will continue to seed to incomplete downloaders, but no new downloads may be initiated.

**Are my files encrypted?** Yes, all WebRTC communications are automatically encrypted using public-key cryptography because of DTLS. You can add an optional password to your upload for an extra layer of security.

## License & Acknowledgements

FilePizza is released under the [BSD 3-Clause license](https://github.com/kern/filepizza/blob/main/LICENSE). A huge thanks to [iblowyourdesign](https://dribbble.com/iblowyourdesign) for the pizza illustration.
