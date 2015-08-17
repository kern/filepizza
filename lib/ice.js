var twilio = require('twilio')
var winston = require('winston')

if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  var client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
} else {
  var client = null
}

var CACHE_LIFETIME = 5 * 60 * 1000 // 5 minutes
var cachedPromise = null

function clearCache() {
  cachedPromise = null
}

exports.getICEServers = function () {
  if (client == null) return Promise.resolve({})
  if (cachedPromise) return cachedPromise

  cachedPromise = new Promise(function (resolve, reject) {
    client.tokens.create({}, function(err, token) {
      if (err) {
        winston.error(err.message)
        return resolve({})
      }

      setTimeout(clearCache, CACHE_LIFETIME)
      resolve(token.ice_servers)
    })
  })

  return cachedPromise
}
