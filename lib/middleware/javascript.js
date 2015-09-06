var path = require('path')

var CLIENT_MODULE_PATH = path.resolve(__dirname, '../client.js')

module.exports = function (req, res) {
  res.sendFile(CLIENT_MODULE_PATH)
}
