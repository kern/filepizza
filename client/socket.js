import io from 'socket.io-client';
import Actions from './Actions';

var socket = module.exports = io.connect(window.location.origin);

socket.on('token', function (token) {
  Actions.updateToken(token);
});

socket.on('download', function (peerID) {
  Actions.sendToDownloader(peerID);
});
