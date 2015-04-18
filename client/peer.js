import uuid from 'node-uuid'

const id = uuid.v4()

if (typeof window === 'undefined') {
  var peer = { id: id }
} else {
  let Peer = require('peerjs')
  var peer = new Peer(id, {
    host: window.location.hostname,
    port: window.location.port,
    path: '/peer',
    config: {
      iceServers: [{
        'url': 'stun:stun.l.google.com:19302'
      }, {
        'url': 'turn:52.12.205.113:3478?transport=udp',
        'username': 'file',
        'credential': 'pizza'
      }, {
        'url': 'turn:52.12.205.113:3479?transport=udp',
        'username': 'file',
        'credential': 'pizza'
      }, {
        'url': 'turn:52.12.205.113:3478?transport=tcp',
        'username': 'file',
        'credential': 'pizza'
      }, {
        'url': 'turn:52.12.205.113:3479?transport=tcp',
        'username': 'file',
        'credential': 'pizza'
      }]
    }
  })
}

export default peer
