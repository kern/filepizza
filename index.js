#!/usr/bin/env node

try {
  require('./newrelic')
  require('newrelic')
} catch (ex) {
  // Don't load New Relic if the configuration file doesn't exist.
}

module.exports = require('./dist/server')
