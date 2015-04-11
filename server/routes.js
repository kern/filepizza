var DownloadFile = require('../client/DownloadFile')
var React = require('react')
var ReactRouter = require('react-router')
var Upload = require('./Upload')
var alt = require('../client/alt')
var clientRoutes = require('../client/routes')
var express = require('express')
var nib = require('nib')
var path = require('path')
var stylus = require('stylus')

var routes = module.exports = new express.Router()

routes.get('/css', function (req, res) {
  // req.path = '/index.css'
  res.send('foo')
})

routes.use(express.static(__dirname + '/../static'))

routes.get('/d/:token', function (req, res, next) {

  var uploader = Upload.find(req.params.token)
  if (uploader) {
    res.locals.data = {
      DownloadStore: {
        status: 'ready',
        token: uploader.token,
        file: uploader.metadata
      }
    }
  }

  next()

})

routes.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

routes.use(function (err, req, res, next) {

  // TODO: Get these error pages working with isomorphic react.
  var status = err.status || 500
  var message = err.message || ''

  res.status(status)
  next()

})

routes.use(function (req, res) {

  alt.bootstrap(JSON.stringify(res.locals.data || {}))

  ReactRouter.run(clientRoutes, req.url, function (Handler) {
    var html = React.renderToString(<Handler data={alt.takeSnapshot()} />)
    alt.flush()
    res.write('<!DOCTYPE html>')
    res.end(html)
  })

})
