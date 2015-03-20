import Actions from './Actions';
import ChunkedBlob from './ChunkedBlob';
import alt from './alt';
import peer from './peer';
import socket from './socket';

const chunkSize = 1024;

function downloadFile(name, blob) {
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.download = name;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

export default alt.createStore(class Store {

  constructor() {
    this.bindActions(Actions);

    this.peerID = null;

    this.uploadToken = null;
    this.uploadFile = null;
    this.readyToUpload = false;

    this.downloadToken = null;
    this.downloadMetadata = null;
    this.downloadChunks = null;
    this.readyToDownload = false;
  }

  updateReadyStatus() {
    this.readyToUpload = !!this.peerID && !!this.uploadToken && !!this.uploadFile;
    this.readyToDownload = !!this.peerID && !!this.downloadToken && !!this.downloadMetadata;
  }

  onSetPeerID(id) {
    this.peerID = id;
    this.updateReadyStatus();
  }

  onSetUploadToken(token) {
    this.uploadToken = token;
    this.updateReadyStatus();
  }

  onUpload(file) {
    this.uploadFile = file;
    this.updateReadyStatus();

    socket.emit('upload', {
      name: file.name,
      size: file.size,
      type: file.type
    });
  }

  onSetDownloadInfo(info) {
    this.downloadToken = info.token;
    this.downloadMetadata = info.metadata;
    this.updateReadyStatus();
  }

  onRequestDownload() {
    if (!this.readyToDownload) return;

    socket.emit('download', {
      peerID: this.peerID,
      token: this.downloadToken
    });
  }

  onSendToDownloader(peerID) {
    if (!this.readyToUpload) return;

    let file = this.uploadFile;
    let conn = peer.connect(peerID);
    conn.on('open', function () {
      let chunks = Math.ceil(file.size / chunkSize);
      for (let i = 0; i < chunks; i++) {
        let start = i * chunkSize;
        let end = start + chunkSize;
        let chunk = file.slice(start, end);
        conn.send({ n: chunks, i: i, b: chunk });
      }
    });
  }

  onReceiveData(data) {
    if (!this.readyToDownload) return;

    if (!this.downloadChunks)
      this.downloadChunks = new ChunkedBlob(data.n);

    this.downloadChunks.setChunk(data.i, data.b);

    if (this.downloadChunks.ready()) {
      let blob = this.downloadChunks.toBlob();
      downloadFile(this.downloadMetadata.name, blob);
    }
  }

})
