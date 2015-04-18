import DownloadActions from '../actions/DownloadActions'
import DownloadButton from './DownloadButton'
import ProgressBar from './ProgressBar'
import DownloadStore from '../stores/DownloadStore'
import React from 'react'
import Spinner from './Spinner'
import peer from '../peer'

export default class DownloadPage extends React.Component {

  constructor() {
    this.state = DownloadStore.getState()

    this._onChange = () => {
      this.setState(DownloadStore.getState())
    }

    this._onConnection = (conn) => {
      DownloadActions.beginDownload(conn)
    }
  }

  componentDidMount() {
    DownloadStore.listen(this._onChange)
    peer.on('connection', this._onConnection)
  }

  componentDidUnmount() {
    DownloadStore.unlisten(this._onChange)
    peer.removeListener('connection', this._onConnection)
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
            name={this.state.file.name}
            size={this.state.file.size} />

          <DownloadButton onClick={this.downloadFile.bind(this)} />

        </div>

      case 'requesting':
      case 'downloading':
        return <div className="page">
          <h1>FilePizza</h1>
          <Spinner dir="down" animated
            name={this.state.file.name}
            size={this.state.file.size} />

          <ProgressBar value={this.state.progress} />

        </div>

      case 'cancelled':
        return <div className="page">
          <h1>FilePizza</h1>
          <Spinner dir="down"
            name={this.state.file.name}
            size={this.state.file.size} />

          <ProgressBar value={-1} />

        </div>

      case 'done':
        return <div className="page">
          <h1>FilePizza</h1>
          <Spinner dir="down"
            name={this.state.file.name}
            size={this.state.file.size} />

          <ProgressBar value={1} />

        </div>
    }
  }

}
