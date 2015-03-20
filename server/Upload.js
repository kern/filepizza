var bases = require('bases');
var crypto = require('crypto');

var tokenLength = 8;
var tokens = {};

var Upload = module.exports = function (socket) {

  var maxNum = Math.pow(62, tokenLength);
  var numBytes = Math.ceil(Math.log(maxNum) / Math.log(256));

  var token = '';
  do {
    do {
      var bytes = crypto.randomBytes(numBytes);
      var num = 0
      for (var i = 0; i < bytes.length; i++) {
        num += Math.pow(256, i) * bytes[i];
      }
    } while (num >= maxNum);

    token = bases.toBase62(num);
  } while (token in tokens);

  this.token = token;
  this.socket = socket;

  tokens[this.token] = this;

};

Upload.exists = function (token) {
  return token in tokens;
};

Upload.find = function (token) {
  return tokens[token];
};
 
Upload.remove = function (client) {
  delete tokens[client.token];
};
