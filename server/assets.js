var browserify = require('browserify-middleware')
var express = require('express')
var nib = require('nib')
var path = require('path')
var stylus = require('stylus')

var routes = module.exports = new express.Router()

routes.get('/css', function (req, res, next) {
  req.url = '/index.css'
  next()
}, stylus.middleware({
  src: path.resolve(__dirname, '../css'),
  dest: path.resolve(__dirname, '../css'),
  compile: function (str, path) {
    return stylus(str)
      .set('filename', path)
      .set('compress', true)
      .use(nib())
      .import('nib')
  }
}), function (req, res) {
  res.sendFile(path.resolve(__dirname, '../css/index.css'))
})

routes.get('/js', browserify(path.resolve(__dirname, '../client/index.js'), {
  transform: 'babelify'
}))

routes.use('/images', express.static(path.resolve(__dirname, '../images')))
