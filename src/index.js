#! /usr/bin/env node

try {
  require('../newrelic')
  require('newrelic')
} catch (ex) {
  // Don't load New Relic if the configuration file doesn't exist.
}

process.on('unhandledRejection', (reason, p) => {
  p.catch(err => {
    console.error('Exiting due to unhandled rejection!')
    console.error(err)
    process.exit(1)
  })
})

process.on('uncaughtException', err => {
  console.error('Exiting due to uncaught exception!')
  console.error(err.stack)
  process.exit(1)
})

module.exports = require('./server')
