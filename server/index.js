var Client = require('./Client');
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

server.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('WebDrop listening on %s:%s', host, port);
});

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/d/:token', function (req, res) {
  console.log("Downloading from:", req.params.token);
  var uploader = Client.find(req.params.token);
  res.render('download', {
    token: uploader.token,
    meta: uploader.metadata
  });
});

app.use(express.static(__dirname + '/../static'));

io.on('connection', function (socket) {

  var client = new Client(socket);
  socket.emit('token', client.token);

  function log(type, data) {
    console.log(client.token, '.', type, ':', data);
  }

  socket.on('upload', function (data) {
    var downloader = Client.find(data.token);
    downloader.socket.emit('upload', data.blob);
    log('upload', data);
  });

  socket.on('download', function (token) {
    var uploader = Client.find(token);
    uploader.socket.emit('download', client.token);
    log('download', token);
  });

  socket.on('update', function (data) {
    client.metadata = data;
    log('update', data);
  });

  socket.on('disconnect', function () {
    Client.remove(client);
  });

});
