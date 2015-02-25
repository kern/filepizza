var express = require('express');
var app = module.exports = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.use(express.static(__dirname + '/../static'));
