import DownloadActions from '../actions/DownloadActions'
import DownloadFile from '../DownloadFile'
import peer from 'filepizza-peerjs'
import alt from '../alt'
import socket from 'filepizza-socket'

export default alt.createStore(class DownloadStore {

  constructor() {
    this.bindActions(DownloadActions)

    this.status = 'ready'
    this.token = null
    this.file = null
    this.progress = 0

    this.on('bootstrap', () => {
      if (this.file && !(this.file instanceof DownloadFile)) {
        this.file = new DownloadFile(this.file.name,
                                     this.file.size,
                                     this.file.type)
      }
    })
  }

  onRequestDownload() {
    if (this.status !== 'ready') return
    this.status = 'requesting'

    socket.emit('download', {
      peerID: peer.id,
      token: this.token
    })
  }

  onBeginDownload(conn) {
    if (this.status !== 'requesting') return
    this.status = 'downloading'

    conn.on('data', (chunk) => {
      if (this.status !== 'downloading') return

      this.file.addChunk(chunk)

      if (this.file.isComplete()) {
        this.setState({ status: 'done', progress: 1 })
        this.file.download()
        conn.close()
      } else {
        this.setState({ progress: this.file.getProgress() })
        conn.send('more')
      }

    })

    conn.on('close', () => {
      if (this.status !== 'downloading') return
      this.setState({ status: 'cancelled', progress: 0 })
      this.file.clearChunks()
    })
  }

}, 'DownloadStore')
