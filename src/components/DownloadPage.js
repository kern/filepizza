import ChromeNotice from './ChromeNotice'
import DownloadActions from '../actions/DownloadActions'
import DownloadButton from './DownloadButton'
import DownloadStore from '../stores/DownloadStore'
import ErrorPage from './ErrorPage'
import ProgressBar from './ProgressBar'
import React from 'react'
import Spinner from './Spinner'
import { formatSize } from '../util'

export default class DownloadPage extends React.Component {

  constructor() {
    super()
    this.state = DownloadStore.getState()

    this._onChange = () => {
      this.setState(DownloadStore.getState())
    }

    this.downloadFile = this.downloadFile.bind(this)
  }

  componentDidMount() {
    DownloadStore.listen(this._onChange)
  }

  componentWillUnmount() {
    DownloadStore.unlisten(this._onChange)
  }

  downloadFile() {
    DownloadActions.requestDownload()
  }

  render() {
    switch (this.state.status) {
      case 'ready':
        return <div className="page">

          <h1>FilePizza</h1>
          <Spinner dir="down"
            name={this.state.fileName}
            size={this.state.fileSize} />

          <ChromeNotice />
          <p className="notice">Peers: {this.state.peers} &middot; Up: {formatSize(this.state.speedUp)} &middot; Down: {formatSize(this.state.speedDown)}</p>
          <DownloadButton onClick={this.downloadFile} />

        </div>

      case 'requesting':
      case 'downloading':
        return <div className="page">

          <h1>FilePizza</h1>
          <Spinner dir="down" animated
            name={this.state.fileName}
            size={this.state.fileSize} />

          <ChromeNotice />
          <p className="notice">Peers: {this.state.peers} &middot; Up: {formatSize(this.state.speedUp)} &middot; Down: {formatSize(this.state.speedDown)}</p>
          <ProgressBar value={this.state.progress} />

        </div>

      case 'done':
        return <div className="page">

          <h1>FilePizza</h1>
          <Spinner dir="down"
            name={this.state.fileName}
            size={this.state.fileSize} />

          <ChromeNotice />
          <p className="notice">Peers: {this.state.peers} &middot; Up: {formatSize(this.state.speedUp)} &middot; Down: {formatSize(this.state.speedDown)}</p>
          <ProgressBar value={1} />

        </div>

      default:
        return <ErrorPage />
    }
  }

}
