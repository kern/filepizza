import UploadActions from '../actions/UploadActions';
import UploadFile from '../UploadFile';
import alt from '../alt';
import peer from '../peer';
import socket from '../socket';

const chunkSize = 32;

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(UploadActions);

    this.status = 'ready';
    this.token = null;
    this.file = null;

    this.inProgress = 0;
    this.completed = 0;
  }

  onUploadFile(file) {
    if (this.status !== 'ready') return;
    this.status = 'processing';
    this.file = new UploadFile(file);

    socket.emit('upload', {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type
    }, (token) => {
      this.setState({
        status: 'uploading',
        token: token
      });
    });
  }

  onSendToDownloader(peerID) {
    if (this.status !== 'uploading') return;

    let conn = peer.connect(peerID, {
      reliable: true,
      metadata: { chunkSize: chunkSize }
    });

    let complete = false;
    let totalPackets = this.file.countPackets();
    let i = 0;

    let sendNextChunk = () => {
      if (complete) return;

      for (let j = 0; i < totalPackets && j < chunkSize; i++, j++) {
        let packet = this.file.getPacket(i);
        console.log(packet.size);
        conn.send(packet);
      }

      if (i === totalPackets) complete = true;
    }

    conn.on('open', () => {
      this.setState({ inProgress: this.inProgress + 1 });
      sendNextChunk();
    });

    conn.on('data', (data) => {
      if (data === 'more') sendNextChunk();
    });

    conn.on('close', () => {
      this.setState({
        inProgress: this.inProgress - 1,
        completed: this.completed + (complete ? 1 : 0)
      });
    });
  }

}, 'UploadStore')
