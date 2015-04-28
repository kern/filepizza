var Peer = require('peerjs')
var uuid = require('node-uuid')

var id = uuid.v4()

module.exports = new Peer(id, {
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
      'url': 'turn:52.12.205.113:80?transport=udp',
      'username': 'file',
      'credential': 'pizza'
    }, {
      'url': 'turn:52.12.205.113:3478?transport=tcp',
      'username': 'file',
      'credential': 'pizza'
    }, {
      'url': 'turn:52.12.205.113:80?transport=tcp',
      'username': 'file',
      'credential': 'pizza'
    }]
  }
})
