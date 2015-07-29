#!/usr/bin/env node

try {
  require('./newrelic')
  require('newrelic')
} catch (ex) {
  // Don't load New Relic if the configuration file doesn't exist.
}

require('babel/register')({
  only: new RegExp(__dirname + '/lib' + '|' +
                   __dirname + '/node_modules/filepizza')
})

module.exports = require('./lib/server')
