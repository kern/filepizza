var Upload = require('./Upload');
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
  var uploader = Upload.find(req.params.token);
  res.render('download', {
    token: uploader.token,
    meta: uploader.metadata
  });
});

app.use(express.static(__dirname + '/../static'));

io.on('connection', function (socket) {

  var upload = null;

  socket.on('upload', function (metadata) {
    if (!upload) upload = new Upload(socket);
    upload.metadata = metadata;
    socket.emit('token', upload.token);
  });

  socket.on('download', function (data) {
    var uploader = Upload.find(data.token);
    uploader.socket.emit('download', data.peerID);
  });

  socket.on('disconnect', function () {
    if (upload) Upload.remove(upload);
  });

});
