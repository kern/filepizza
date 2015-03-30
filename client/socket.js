if (typeof window === 'undefined') {
  var socket = {};
} else {
  let io = require('socket.io-client');
  var socket = io.connect();
}

export default socket;
