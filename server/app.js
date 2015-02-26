var express = require('express');
var path = require('path');
var app = module.exports = express();
var db = require('./db');

var greeting = 'Hello World!';
db.child('greeting').on('value', function(snapshot) {
  greeting = snapshot.val();
});

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/../static/index.html'));
});

app.use(express.static(__dirname + '/../static'));
