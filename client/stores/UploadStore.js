import PeerActions from '../actions/PeerActions';
import PeerStore from './PeerStore';
import Status from '../Status';
import UploadActions from '../actions/UploadActions';
import UploadFile from '../UploadFile';
import alt from '../alt';
import peer from '../peer';
import socket from '../socket';

const chunkSize = 32;

class UploadStatus extends Status {
  constructor() {
    super([
      'offline',
      'ready',
      'processing',
      'uploading'
    ]);
  }
}

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(PeerActions);
    this.bindActions(UploadActions);

    this.token = null;
    this.file = null;
    this.status = new UploadStatus();
  }

  onSetPeerID(id) {
    this.waitFor(PeerStore.dispatchToken);
    if (this.status.isOffline()) this.status.set('ready');
  }

  onUploadFile(file) {
    if (!this.status.isReady()) return;
    this.status.set('processing');

    this.file = new UploadFile(file);
    socket.emit('upload', {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type
    }, (token) => {
      this.status.set('uploading');
      this.token = token;
      this.emitChange();
    });
  }

  onSendToDownloader(peerID) {
    if (!this.status.isUploading()) return;

    let file = this.file;
    let conn = peer.connect(peerID, {
      reliable: true,
      metadata: { chunkSize: chunkSize }
    });

    conn.on('open', function () {

      let packets = file.countPackets();
      let packet = 0;

      function sendNextChunk() {
        for (let i = 0; i < chunkSize; i++) {
          if (packet >= packets) break;
          let b = file.getPacket(packet);
          conn.send(b);
          packet++;
        }
      }

      conn.on('data', function (data) {
        if (data === 'more') sendNextChunk();
      });

      sendNextChunk();

    });
  }

})
