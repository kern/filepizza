import socket from './socket';

export default function (file, token) {

  socket.emit('upload', {
    token: token,
    blob: file
  });

}
