import ChromeNotice from './ChromeNotice'
import DownloadActions from '../actions/DownloadActions'
import DownloadButton from './DownloadButton'
import DownloadStore from '../stores/DownloadStore'
import ErrorPage from './ErrorPage'
import ProgressBar from './ProgressBar'
import React from 'react'
import Spinner from './Spinner'

export default class DownloadPage extends React.Component {

  constructor() {
    super()
    this.state = DownloadStore.getState()

    this._onChange = () => {
      this.setState(DownloadStore.getState())
    }
  }

  componentDidMount() {
    DownloadStore.listen(this._onChange)
  }

  componentDidUnmount() {
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
          <DownloadButton onClick={this.downloadFile.bind(this)} />

        </div>

      case 'requesting':
      case 'downloading':
        return <div className="page">

          <h1>FilePizza</h1>
          <Spinner dir="down" animated
            name={this.state.fileName}
            size={this.state.fileSize} />

          <ChromeNotice />
          <ProgressBar value={this.state.progress} />

        </div>

      case 'done':
        return <div className="page">

          <h1>FilePizza</h1>
          <Spinner dir="down"
            name={this.state.fileName}
            size={this.state.fileSize} />

          <ChromeNotice />
          <ProgressBar value={1} />

        </div>

      default:
        return <ErrorPage />
    }
  }

}
