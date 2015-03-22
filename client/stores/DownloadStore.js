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

    this.conn = null;
    this.token = null;
    this.file = null;
    this.status = new DownloadStatus();
  }

  onSetPeerID() {
    this.waitFor(PeerStore.dispatchToken);
    if (this.status.isOffline() && this.token) this.status.set('ready');
  }

  onSetDownloadInfo(info) {
    this.token = info.token;
    this.file = new DownloadFile(info.name, info.size, info.type);
    if (this.status.isOffline() && PeerStore.getPeerID()) this.status.set('ready');
  }

  onRequestDownload() {
    if (!this.status.isReady()) return;
    this.status.set('requesting');

    socket.emit('download', {
      peerID: PeerStore.getPeerID(),
      token: this.token
    });
  }

  onBeginDownload(conn) {
    if (!this.status.isRequesting()) return;
    this.status.set('downloading');

    this.conn = conn;
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
      this._cancel();
    });
  }

  onCancelDownload() {
    if (!this.status.isRequesting() && !this.status.isDownloading()) return;
    this._cancel();
  }

  _cancel() {
    this.status.set('cancelled');
    if (this.conn) this.conn.close();
    this.conn = null;
    this.file.clearPackets();
  }

})
