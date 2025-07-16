#!/usr/bin/env node
const express = require('express')
const { ExpressPeerServer } = require('peer')

const app = express();
const port = process.env.PEERJS_PORT || 9000;
const server = app.listen(port);

const peerServer = ExpressPeerServer(server, {
  path: process.env.PEERJS_PATH || '/myapp',
  key: process.env.PEERJS_KEY || 'peerjs',
  proxied: process.env.PEERJS_PROXIED === 'true',
  allow_discovery: process.env.PEERJS_ALLOW_DISCOVERY === 'true',
  concurrent_limit: parseInt(process.env.PEERJS_CONCURRENT_LIMIT || '5000')
})

app.use('/peerjs', peerServer)

console.log(`PeerJS server running on port ${port} with path ${process.env.PEERJS_PATH || '/myapp'}`)