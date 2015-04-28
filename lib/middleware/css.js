var express = require('express')
var nib = require('nib')
var path = require('path')
var stylus = require('stylus')

var CSS_PATH = path.resolve(__dirname, '../../css')
var COMPILED_PATH = path.resolve(__dirname, '../../css/index.css')

var routes = module.exports = new express.Router()

routes.use(function (req, res, next) {
  req.url = '/index.css'
  next()
}, stylus.middleware({
  src: CSS_PATH,
  dest: CSS_PATH,
  compile: function (str, path) {
    return stylus(str)
      .set('filename', path)
      .set('compress', true)
      .use(nib())
      .import('nib')
  }
}), function (req, res) {
  res.sendFile(COMPILED_PATH)
})
