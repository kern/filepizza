import io from 'socket.io-client';
import UploadActions from './actions/UploadActions';

var socket = module.exports = io.connect();

socket.on('download', function (peerID) {
  UploadActions.sendToDownloader(peerID);
});
