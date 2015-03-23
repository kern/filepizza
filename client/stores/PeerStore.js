import Peer from 'peerjs';
import PeerActions from '../actions/PeerActions';
import alt from '../alt';
import uuid from 'node-uuid';

let id = uuid.v4();
let peer = new Peer(id, {
  host: window.location.hostname,
  port: window.location.port,
  path: '/peer'
});

peer.on('connection', (conn) => {
  PeerActions.peerConnected(conn);
});

export default alt.createStore(class PeerStore {

  static connect(peerID, metadata) {
    return peer.connect(peerID, {
      reliable: true,
      metadata: metadata
    });
  }

  static getPeerID() {
    return id;
  }

})
