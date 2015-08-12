import UploadActions from '../actions/UploadActions'
import alt from '../alt'
import socket from 'filepizza-socket'
import WebTorrent from 'webtorrent'

const SPEED_REFRESH_TIME = 2000

export default alt.createStore(class UploadStore {

  constructor() {
    this.bindActions(UploadActions)

    this.fileName = ''
    this.fileSize = 0
    this.fileType = ''
    this.infoHash = null
    this.peers = 0
    this.speedUp = 0
    this.status = 'ready'
    this.token = null
  }

  onUploadFile(file) {
    if (this.status !== 'ready') return
    this.status = 'processing'

    const client = new WebTorrent()
    client.seed(file, (torrent) => {

      const updateSpeed = () => {
        this.setState({
          speedUp: torrent.swarm.uploadSpeed(),
          peers: torrent.swarm.wires.length
        })
      }

      torrent.on('upload', updateSpeed)
      torrent.on('download', updateSpeed)
      setInterval(updateSpeed, SPEED_REFRESH_TIME)

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
