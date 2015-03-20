var Upload = require('./Upload');
var express = require('express');

var router = module.exports = new express.Router();

router.get('/', function (req, res) {
  res.render('index');
});

router.get('/d/:token', function (req, res, next) {

  var uploader = Upload.find(req.params.token);
  if (uploader) {
    res.render('download', {
      token: uploader.token,
      meta: uploader.metadata
    });
  } else {
    var err = new Error('Unknown token');
    err.status = 404;
    next(err);
  }

});

router.use(express.static(__dirname + '/../static'));

router.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

router.use(function (err, req, res, next) {

  var status = err.status || 500;
  var message = err.message || '';

  res.status(status).render('error', {
    status: status,
    message: message
  });

});
