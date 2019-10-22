var db = require('../db')
var express = require('express')

var routes = module.exports = new express.Router()

function bootstrap (uploader, req, res, next) {
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
}

routes.get(/^\/([a-z]+\/[a-z]+\/[a-z]+\/[a-z]+)$/, function (req, res, next) {
  var uploader = db.find(req.params[0])
  return bootstrap(uploader, req, res, next)
})

routes.get(/^\/download\/(\w+)$/, function (req, res, next) {
  var uploader = db.findShort(req.params[0])
  return bootstrap(uploader, req, res, next)
})
