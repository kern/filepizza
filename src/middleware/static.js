const path = require('path')
const express = require('express')

const STATIC_PATH = path.resolve(__dirname, '../static')

module.exports = express.static(STATIC_PATH)
