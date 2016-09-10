const path = require('path')

const BUNDLE_PATH = path.resolve(__dirname, '../../dist/bundle.js')

if (process.env.NODE_ENV === 'production') {
  module.exports = function (req, res) {
    res.sendFile(BUNDLE_PATH)
  }
} else {
  const webpackMiddleware = require('webpack-dev-middleware')
  const webpack = require('webpack')
  const config = require('../../webpack.config.js')
  config.output.filename = '/app.js'
  config.output.path = '/'
  module.exports = webpackMiddleware(webpack(config))
}
