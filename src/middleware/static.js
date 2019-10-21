var express = require('express')
var path = require('path')

var STATIC_PATH = path.resolve(__dirname, '../static')

module.exports = express.static(STATIC_PATH)
