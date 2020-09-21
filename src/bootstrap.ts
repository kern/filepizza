const express = require('express')
const db = require('../db')

const routes = module.exports = new express.Router()

function bootstrap(uploader, req, res, next) {
  if (uploader) {
    res.locals.data = {
      DownloadStore: {
        status: 'ready',
        token: uploader.token,
        fileSize: uploader.fileSize,
        fileName: uploader.fileName,
        fileType: uploader.fileType,
        infoHash: uploader.infoHash,
      },
    }

    next()
  } else {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
  }
}

routes.get(/^\/([a-z]+\/[a-z]+\/[a-z]+\/[a-z]+)$/, (req, res, next) => {
  const uploader = db.find(req.params[0])
  return bootstrap(uploader, req, res, next)
})
routes.get(/^\/download\/(\w+)$/, (req, res, next) => {
  const uploader = db.findShort(req.params[0])
  return bootstrap(uploader, req, res, next)
})
