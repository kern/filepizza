var express = require('express');
var app = module.exports = express();
var db = require('./db');

var greeting = 'Hello World!';
db.child('greeting').on('value', function(snapshot) {
  greeting = snapshot.val();
});

app.get('/', function (req, res) {
  res.send(greeting);
});

app.use(express.static(__dirname + '/../static'));
