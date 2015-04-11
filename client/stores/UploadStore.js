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

    this.inProgress = 0
    this.completed = 0
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
    }

    conn.on('open', () => {
      this.setState({ inProgress: this.inProgress + 1 })
      sendNextChunk()
    })

    conn.on('data', (data) => {
      if (data === 'more') sendNextChunk()
    })

    conn.on('close', () => {
      this.setState({
        inProgress: this.inProgress - 1,
        completed: this.completed + (i === totalChunks ? 1 : 0)
      })
    })
  }

}, 'UploadStore')
