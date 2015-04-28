var browserify = require('browserify-middleware')
var express = require('express')
var path = require('path')

var CLIENT_MODULE_PATH = path.resolve(__dirname, '../client.js')

module.exports = browserify(CLIENT_MODULE_PATH, {
  transform: 'babelify'
})
