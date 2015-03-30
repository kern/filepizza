import uuid from 'node-uuid';

let id = uuid.v4();

if (typeof window === 'undefined') {
  var peer = { id: id };
} else {
  let Peer = require('peerjs');
  var peer = new Peer(id, {
    host: window.location.hostname,
    port: window.location.port,
    path: '/peer'
  });
}

export default peer;
