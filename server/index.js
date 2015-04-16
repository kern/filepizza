var Upload = require('./Upload');
var express = require('express');
var http = require('http');
var path = require('path');
var peer = require('peer');
var routes = require('./routes');
var socketIO = require('socket.io');
var morgan = require('morgan');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

server.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('WebDrop listening on %s:%s', host, port);
});

app.use('/peer', peer.ExpressPeerServer(server));
app.use(morgan('combined'));
app.use(require('./assets'));
app.use(require('./routes'));

io.on('connection', function (socket) {

  var upload = null;

  socket.on('upload', function (metadata, res) {
    if (!upload) upload = new Upload(socket);
    upload.metadata = metadata;
    res(upload.token);
  });

  socket.on('download', function (data) {
    var uploader = Upload.find(data.token);
    if (!uploader) return;
    uploader.socket.emit('download', data.peerID);
  });

  socket.on('disconnect', function () {
    if (upload) Upload.remove(upload);
  });

});
