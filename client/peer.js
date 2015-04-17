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
        'url': 'turn:52.12.203.39:80',
        'username': 'file',
        'credential': 'pizza'
      }, {
        'url': 'turn:52.12.203.39:443',
        'username': 'file',
        'credential': 'pizza'
      }]
    }
  })
}

export default peer
