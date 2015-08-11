import UploadActions from '../actions/UploadActions'
import alt from '../alt'
import socket from 'filepizza-socket'
import WebTorrent from 'webtorrent'

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(UploadActions)

    this.fileName = ''
    this.fileSize = 0
    this.fileType = ''
    this.status = 'ready'
    this.token = null
    this.infoHash = null
  }

  onUploadFile(file) {
    if (this.status !== 'ready') return
    this.status = 'processing'

    const client = new WebTorrent()
    client.seed(file, (torrent) => {
      socket.emit('upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        infoHash: torrent.infoHash
      }, (token) => {
        this.setState({
          status: 'uploading',
          token: token,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          infoHash: torrent.infoHash
        })
      })
    })
  }

}, 'UploadStore')
