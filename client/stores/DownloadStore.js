import DownloadActions from '../actions/DownloadActions';
import DownloadFile from '../DownloadFile';
import peer from '../peer';
import alt from '../alt';
import socket from '../socket';

export default alt.createStore(class DownloadStore {

  constructor() {
    this.bindActions(DownloadActions);

    this.status = 'offline';
    this.token = null;
    this.file = null;
    this.progress = 0;

    this.on('bootstrap', () => {
      if (this.file && !(this.file instanceof DownloadFile))
        this.file = new DownloadFile(this.file.name, this.file.size, this.file.type);
    });
  }

  onRequestDownload() {
    if (this.status !== 'ready') return;
    this.status = 'requesting';

    socket.emit('download', {
      peerID: peer.id,
      token: this.token
    });
  }

  onBeginDownload(conn) {
    if (this.status !== 'requesting') return;
    this.status = 'downloading';

    let chunkSize = conn.metadata.chunkSize;
    let i = 0;

    conn.on('data', (data) => {
      if (this.status !== 'downloading') return;

      this.file.addPacket(data);
      i++;

      if (this.file.isComplete()) {
        this.setState({ status: 'done', progress: 1 });
        this.file.download();
        conn.close();
      } else {
        this.setState({ progress: this.file.getProgress() });
        if (i % chunkSize === 0) conn.send('more');
      }

    });

    conn.on('close', () => {
      if (this.status !== 'downloading') return;
      this.setState({ status: 'cancelled', progress: 0 });
      this.file.clearPackets();
    });
  }

}, 'DownloadStore')
