import UploadActions from '../actions/UploadActions'
import UploadFile from '../UploadFile'
import alt from '../alt'
import peer from '../peer'
import socket from '../socket'

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(UploadActions)

    this.status = 'ready'
    this.token = null
    this.file = null
    this.peerProgress = {}
  }

  onUploadFile(file) {
    if (this.status !== 'ready') return
    this.status = 'processing'
    this.file = new UploadFile(file)

    socket.emit('upload', {
      name: this.file.name,
      size: this.file.size,
      type: this.file.type
    }, (token) => {
      this.setState({
        status: 'uploading',
        token: token
      })
    })
  }

  onSendToDownloader(peerID) {
    if (this.status !== 'uploading') return

    let conn = peer.connect(peerID, {
      reliable: true
    })

    let totalChunks = this.file.countChunks()
    let i = 0

    let sendNextChunk = () => {
      if (i === totalChunks) return
      let packet = this.file.getChunk(i)
      conn.send(packet)
      i++
      this.peerProgress[peerID] = i/totalChunks
    }

    conn.on('open', () => {
      sendNextChunk()
      this.setState({ peerProgress: this.peerProgress })
    })

    conn.on('data', (data) => {
      if (data === 'more') sendNextChunk()
      this.setState({ peerProgress: this.peerProgress })
    })

    conn.on('close', () => {
      this.setState({ peerProgress: this.peerProgress })
    })
  }

}, 'UploadStore')
