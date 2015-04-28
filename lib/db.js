import bases from 'bases'
import crypto from 'crypto'

var tokenLength = 8
var tokens = {}

exports.create = function (socket) {

  var maxNum = Math.pow(62, tokenLength)
  var numBytes = Math.ceil(Math.log(maxNum) / Math.log(256))

  var token = ''
  do {
    do {
      var bytes = crypto.randomBytes(numBytes)
      var num = 0
      for (var i = 0; i < bytes.length; i++) {
        num += Math.pow(256, i) * bytes[i]
      }
    } while (num >= maxNum)

    token = bases.toBase62(num)
  } while (token in tokens)

  const result = {
    token: token,
    socket: socket
  }

  tokens[token] = result
  return result

}

exports.exists = function (token) {
  return token in tokens
}

exports.find = function (token) {
  return tokens[token]
}
 
exports.remove = function (client) {
  delete tokens[client.token]
}
