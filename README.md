# FilePizza

_Peer-to-peer file transfers in your browser_

Using [WebRTC](http://www.webrtc.org/), FilePizza eliminates the need for intermediate servers when transferring files between two browsers. This makes the transfer faster, private, and no longer limited by server storage/bandwidth constraints.

## Usage

Visit [file.pizza](https://file.pizza) to use the hosted version.

## Running locally

```bash
pnpm install
pnpm dev
```

## Environment variables

- `REDIS_URL` – Redis connection URL (defaults to `redis://localhost:6379`)
- `PEERJS_HOST` – PeerJS server hostname
- `PEERJS_PORT` – PeerJS server port
- `PEERJS_PATH` – PeerJS server path
- `COTURN_ENABLED` – When set to `true`, enables TURN support for connecting peers behind restrictive NATs.
- `COTURN_URL` – TURN server URL
- `COTURN_SECRET` – TURN server shared secret
- `COTURN_TTL` – TURN credential TTL in seconds

## Docker

```bash
docker-compose up
```

## License

Copyright (c) 2024 kern. MIT License.
