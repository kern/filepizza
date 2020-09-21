const twilio = require("twilio");
var winston = require("winston");
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  const twilioSID = process.env.TWILIO_SID;
  const twilioToken = process.env.TWILIO_TOKEN;
  var client = twilio(twilioSID, twilioToken);
  winston.info("Using Twilio TURN service");
} else {
  var client = null;
}

let ICE_SERVERS = [
  {
    urls: "stun:stun.l.google.com:19302",
  },
];

if (process.env.ICE_SERVERS) {
  ICE_SERVERS = JSON.parse(process.env.ICE_SERVERS)
}

const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes
let cachedPromise = null;

function clearCache() {
  cachedPromise = null;
}

exports.getICEServers = function() {
  if (client == null) {
    return Promise.resolve(ICE_SERVERS)
  }
  if (cachedPromise) {
    return cachedPromise
  }

  cachedPromise = new Promise((resolve, reject) => {
    client.tokens.create({}, (err, token) => {
      if (err) {
        winston.error(err);
        return resolve(DEFAULT_ICE_SERVERS);
      }

      winston.info("Retrieved ICE servers from Twilio");
      ;setTimeout(clearCache, CACHE_LIFETIME)
      resolve(token.ice_servers);
    })
  });

  return cachedPromise;
}
