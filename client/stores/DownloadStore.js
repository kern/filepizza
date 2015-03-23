import DownloadActions from '../actions/DownloadActions';
import DownloadFile from '../DownloadFile';
import PeerActions from '../actions/PeerActions';
import PeerStore from './PeerStore';
import Status from '../Status';
import alt from '../alt';
import socket from '../socket';

class DownloadStatus extends Status {
  constructor() {
    super([
      'offline',
      'ready',
      'requesting',
      'downloading',
      'cancelled',
      'done'
    ]);
  }
}

export default alt.createStore(class DownloadStore {

  constructor() {
    this.bindActions(DownloadActions);
    this.bindActions(PeerActions);

    this.token = null;
    this.file = null;
    this.status = new DownloadStatus();
  }

  onSetDownloadInfo(info) {
    if (!this.status.isOffline()) return;
    this.status.set('ready');

    this.token = info.token;
    this.file = new DownloadFile(info.name, info.size, info.type);
  }

  onRequestDownload() {
    if (!this.status.isReady()) return;
    this.status.set('requesting');

    socket.emit('download', {
      peerID: PeerStore.getPeerID(),
      token: this.token
    });
  }

  onPeerConnected(conn) {
    if (!this.status.isRequesting()) return;
    this.status.set('downloading');

    let chunkSize = conn.metadata.chunkSize;
    let i = 0;

    conn.on('data', (data) => {
      if (!this.status.isDownloading()) return;

      this.file.addPacket(data);
      i++;

      if (this.file.isComplete()) {
        this.status.set('done');
        this.file.download();
        conn.close();
      } else if (i % chunkSize === 0) {
        conn.send('more');
      }

    });

    conn.on('close', () => {
      if (!this.status.isDownloading()) return;
      this.status.set('cancelled');
      this.file.clearPackets();
    });
  }

})
