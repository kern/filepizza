import PeerStore from './PeerStore';
import Status from '../Status';
import UploadActions from '../actions/UploadActions';
import UploadFile from '../UploadFile';
import alt from '../alt';
import socket from '../socket';

const chunkSize = 32;

class UploadStatus extends Status {
  constructor() {
    super([
      'ready',
      'processing',
      'uploading'
    ]);
  }
}

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(UploadActions);

    this.status = new UploadStatus();
    this.token = null;
    this.file = null;
    this.downloaders = [];
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
    this.downloaders.push(peerID); // TODO

    let conn = PeerStore.connect(peerID, {
      chunkSize: chunkSize
    });

    let totalPackets = this.file.countPackets();
    let i = 0;

    let sendNextChunk = () => {
      for (let j = 0; i < totalPackets && j < chunkSize; i++, j++) {
        let packet = this.file.getPacket(i);
        conn.send(packet);
      }
    }

    conn.on('open', () => { sendNextChunk(); });

    conn.on('data', (data) => {
      if (data === 'more') sendNextChunk();
    });
  }

})
