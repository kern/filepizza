#!/usr/bin/env node
const express = require('express')
const { ExpressPeerServer } = require('peer')

const app = express();
const server = app.listen(9000);

const peerServers = process.env.PEERJS_SERVERS
  ? process.env.PEERJS_SERVERS.split(',').map(url => url.trim())
  : [];

if (peerServers.length > 0) {
  app.use('/api/peerjs-servers', (req, res) => {
    res.json({ servers: peerServers });
  });
}

const peerServer = ExpressPeerServer(server, {
  path: '/filepizza'
})

app.use('/peerjs', peerServer)