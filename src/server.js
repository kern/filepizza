const fs = require('fs')
const express = require('express')
const expressWinston = require('express-winston')
const socketIO = require('socket.io')
const winston = require('winston')
const ice = require('./ice')
const db = require('./db')

process.on('unhandledRejection', (reason, p) => {
  p.catch(err => {
    log.error('Exiting due to unhandled rejection!')
    log.error(err)
    process.exit(1)
  })
})

process.on('uncaughtException', (err) => {
  log.error('Exiting due to uncaught exception!')
  log.error(err)
  process.exit(1)
})
const app = express()
let port
process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 3000)

if (!process.env.QUIET) {
  app.use(
    expressWinston.logger({
    winstonInstance: winston,
    expressFormat: true,
  }))
}

app.get('/app.js', require('./middleware/javascript'))
app.use(require('./middleware/static'))

app.use([
  require('./middleware/bootstrap'),
  require('./middleware/error'),
  require('./middleware/react'),
])

const TRACKERS = process.env.WEBTORRENT_TRACKERS
  ? process.env.WEBTORRENT_TRACKERS.split(',').map(t => [t.trim()])
  : [
    ['wss://tracker.openwebtorrent.com'],
    ['wss://tracker.btorrent.xyz'],
    ['wss://tracker.fastcast.nz'],
  ]

function bootServer(server) {
  const io = socketIO(server)
  io.set('transports', ['polling'])

  io.on('connection', (socket) => {
    let upload = null

    socket.on('upload', (metadata, res) => {
      if (upload) {
        return
      }
      db.create(socket).then(u => {
        upload = u
        upload.fileName = metadata.fileName
        upload.fileSize = metadata.fileSize
        upload.fileType = metadata.fileType
        upload.infoHash = metadata.infoHash
        res({ token: upload.token, shortToken: upload.shortToken })
      })
    })

    socket.on('trackerConfig', (_, res) => {
      ice.getICEServers().then(iceServers => {
        res({ rtcConfig: { iceServers }, announce: TRACKERS })
      })
    })

    socket.on('disconnect', () => {
      db.remove(upload)
    })
  })

  server.on('error', (err) => {
    winston.error(err.message)
    process.exit(1)
  })
  server.listen(port, (err) => {
    const host = server.address().address
    const port = server.address().port
    winston.info('FilePizza listening on %s:%s', host, port)
  })
}

if (process.env.HTTPS_KEY && process.env.HTTPS_CERT) {
  // user-supplied HTTPS key/cert
  const https = require('https')

  var server = https.createServer(
    {
      key: fs.readFileSync(process.env.HTTPS_KEY),
      cert: fs.readFileSync(process.env.HTTPS_CERT),
    },
    app,
  )
  bootServer(server)
} else {
  // no HTTPS
  const http = require('http')

  var server = http.Server(app)
  bootServer(server)
}
