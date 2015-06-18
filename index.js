#!/usr/bin/env node

require('babel/register')({
  only: new RegExp(__dirname + '/lib' + '|' +
                   __dirname + '/node_modules/filepizza')
})

module.exports = require('./lib/server')
