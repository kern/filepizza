var app = require('./app');

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('WebDrop listening on %s:%s', host, port);
})
