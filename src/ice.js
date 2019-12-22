var twilio = require("twilio");
var winston = require("winston");

if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  var twilioSID = process.env.TWILIO_SID;
  var twilioToken = process.env.TWILIO_TOKEN;
  var client = twilio(twilioSID, twilioToken);
  winston.info("Using Twilio TURN service");
} else {
  var client = null;
}

var ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302"
  }
];

if (process.env.ICE_SERVERS) {
  ICE_SERVERS = JSON.parse(process.env.ICE_SERVERS)
}

var CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes
var cachedPromise = null;

function clearCache() {
  cachedPromise = null;
}

exports.getICEServers = function() {
  if (client == null) return Promise.resolve(ICE_SERVERS);
  if (cachedPromise) return cachedPromise;

  cachedPromise = new Promise(function(resolve, reject) {
    client.tokens.create({}, function(err, token) {
      if (err) {
        winston.error(err);
        return resolve(DEFAULT_ICE_SERVERS);
      }

      winston.info("Retrieved ICE servers from Twilio");
      setTimeout(clearCache, CACHE_LIFETIME);
      resolve(token.ice_servers);
    });
  });

  return cachedPromise;
};
