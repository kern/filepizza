import DownloadActions from '../actions/DownloadActions'
import alt from '../alt'
import socket from 'filepizza-socket'
import { getClient } from '../wt'

const SPEED_REFRESH_TIME = 2000

function downloadBlobURL(name, blobURL) {
  let a = document.createElement('a')
  document.body.appendChild(a)
  a.download = name
  a.href = blobURL
  a.click()
}

export default alt.createStore(class DownloadStore {

  constructor() {
    this.bindActions(DownloadActions)

    this.fileName = ''
    this.fileSize = 0
    this.fileType = ''
    this.infoHash = null
    this.peers = 0
    this.progress = 0
    this.speedDown = 0
    this.speedUp = 0
    this.status = 'uninitialized'
    this.token = null
  }

  onRequestDownload() {
    if (this.status !== 'ready') return
    this.status = 'requesting'

    getClient().then(client => {
      client.add(this.infoHash, { announce: client.tracker.announce }, (torrent) => {
        this.setState({ status: 'downloading' })

        const updateSpeed = () => {
          this.setState({
            speedUp: torrent.uploadSpeed,
            speedDown: torrent.downloadSpeed,
            peers: torrent.numPeers
          })
        }

        torrent.on('upload', updateSpeed)
        torrent.on('download', updateSpeed)
        setInterval(updateSpeed, SPEED_REFRESH_TIME)

        const file = torrent.files[0]
        const stream = file.createReadStream()
        stream.on('data', (chunk) => {
          if (this.status !== 'downloading') return

          if (torrent.progress === 1) {
            this.setState({ status: 'done', progress: 1 })
            file.getBlobURL((err, blobURL) => {
              if (err) throw err
              downloadBlobURL(this.fileName, blobURL)
            })
          } else {
            this.setState({ progress: torrent.progress })
          }

        })
      })
    })
  }

}, 'DownloadStore')
