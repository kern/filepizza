import DownloadActions from '../actions/DownloadActions'
import webtorrent from '../webtorrent'
import alt from '../alt'
import socket from 'filepizza-socket'

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

    webtorrent.download(this.infoHash, (torrent) => {
      this.setState({ status: 'downloading' })

      const updateSpeed = () => {
        this.setState({
          speedUp: torrent.swarm.uploadSpeed(),
          speedDown: torrent.swarm.downloadSpeed(),
          peers: torrent.swarm.wires.length
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
  }

}, 'DownloadStore')
