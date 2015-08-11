var db = require('../db')
var express = require('express')

var routes = module.exports = new express.Router()

routes.get(/^\/([a-z]+-[a-z]+-[a-z]+-[a-z]+)$/, function (req, res, next) {

  var uploader = db.find(req.params[0])
  if (uploader) {
    res.locals.data = {
      DownloadStore: {
        status: 'ready',
        token: uploader.token,
        fileSize: uploader.fileSize,
        fileName: uploader.fileName,
        fileType: uploader.fileType,
        infoHash: uploader.infoHash
      }
    }

    next()
  } else {
    var err = new Error('Not Found')
    err.status = 404
    next(err)
  }

})
