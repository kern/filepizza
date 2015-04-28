var db = require('../db')
var express = require('express')

var routes = module.exports = new express.Router()

routes.get('/d/:token', function (req, res, next) {

  var uploader = db.find(req.params.token)
  if (uploader) {
    res.locals.data = {
      DownloadStore: {
        status: 'ready',
        token: uploader.token,
        file: uploader.metadata
      }
    }

    next()
  } else {
    var err = new Error('Not Found')
    err.status = 404
    next(err)
  }

})
