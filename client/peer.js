import Actions from './Actions';
import Peer from 'peerjs';

var peer = module.exports = new Peer({ key: '8w3x9m637e0o1or' });

peer.on('open', function () {
  Actions.setPeerID(peer.id);
});

peer.on('connection', function (conn) {
  conn.on('data', function (data) {
    Actions.receiveData(data);
  });
});
