#!/usr/bin/env node
const express = require('express')
const { ExpressPeerServer } = require('peer')

const app = express();
const server = app.listen(9000);
const peerServer = ExpressPeerServer(server, {
  path: '/filepizza'
})

app.use('/peerjs', peerServer)
