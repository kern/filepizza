var db = require('./db')
var express = require('express')
var http = require('http')
var path = require('path')
var peer = require('peer')
var socketIO = require('socket.io')
var morgan = require('morgan')

var app = express()
var server = http.Server(app)
var io = socketIO(server)

server.listen(process.env.PORT || 3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('FilePizza listening on %s:%s', host, port)
})

app.use('/peer', peer.ExpressPeerServer(server))
app.use(morgan('dev'))

app.get('/js', require('./middleware/javascript'))
app.get('/css', require('./middleware/css'))
app.use(require('./middleware/static'))

app.use([
  require('./middleware/bootstrap'),
  require('./middleware/error'),
  require('./middleware/react')
])

io.on('connection', function (socket) {

  var upload = null

  socket.on('upload', function (metadata, res) {
    if (upload) return
    upload = true
    db.create(socket).then((u) => {
      upload = u
      upload.metadata = metadata
      res(upload.token)
    })
  })

  socket.on('download', function (data) {
    var uploader = db.find(data.token)
    if (!uploader) return
    uploader.socket.emit('download', data.peerID)
  })

  socket.on('disconnect', function () {
    if (upload) db.remove(upload)
  })

})
