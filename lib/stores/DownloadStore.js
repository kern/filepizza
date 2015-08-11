import DownloadActions from '../actions/DownloadActions'
import WebTorrent from 'webtorrent'
import alt from '../alt'
import socket from 'filepizza-socket'

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
    this.progress = 0
    this.status = 'uninitialized'
    this.token = null
    this.infoHash = null
  }

  onRequestDownload() {
    if (this.status !== 'ready') return
    this.status = 'requesting'

    const client = new WebTorrent()
    client.download(this.infoHash, (torrent) => {
      this.setState({ status: 'downloading' })

      let downloaded = 0
      const file = torrent.files[0]
      const stream = file.createReadStream()
      stream.on('data', (chunk) => {
        if (this.status !== 'downloading') return

        downloaded += chunk.length

        if (downloaded === file.length) {
          this.setState({ status: 'done', progress: 1 })
          file.getBlobURL((err, blobURL) => {
            if (err) throw err
            downloadBlobURL(this.fileName, blobURL)
          })
        } else {
          this.setState({ progress: downloaded / file.length })
        }

      })
    })
  }

}, 'DownloadStore')
