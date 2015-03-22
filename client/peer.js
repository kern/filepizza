import DownloadActions from './actions/DownloadActions';
import Peer from 'peerjs';
import PeerActions from './actions/PeerActions';

var peer = module.exports = new Peer({ key: '8w3x9m637e0o1or' });

peer.on('open', function () {
  PeerActions.setPeerID(peer.id);
});

peer.on('connection', function (conn) {
  DownloadActions.beginDownload(conn);
});
