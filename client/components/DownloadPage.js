// TODO: Flesh out this page further.

import Arrow from './Arrow';
import DownloadActions from '../actions/DownloadActions';
import DownloadStore from '../stores/DownloadStore';
import React from 'react';
import peer from '../peer';

function formatProgress(dec) {
  return (dec * 100).toPrecision(3) + "%";
}

export default class DownloadPage extends React.Component {

  constructor() {
    this.state = DownloadStore.getState();

    this._onChange = () => {
      this.setState(DownloadStore.getState());
    };

    this._onConnection = (conn) => {
      DownloadActions.beginDownload(conn);
    };
  }

  componentDidMount() {
    DownloadStore.listen(this._onChange);
    peer.on('connection', this._onConnection);
  }

  componentDidUnmount() {
    DownloadStore.unlisten(this._onChange);
    peer.removeListener('connection', this._onConnection);
  }

  downloadFile() {
    DownloadActions.requestDownload();
  }

  render() {
    switch (this.state.status) {
      case 'ready':
        return <div className="download-page">
          <Arrow dir="down" name={this.state.name} size={this.state.size} />
          <button onClick={this.downloadFile.bind(this)}>Download</button>
          <span>Progress: {formatProgress(this.state.progress)}</span>
        </div>;

      case 'downloading':
        return <div className="download-page">
          <Arrow dir="down" name={this.state.name} size={this.state.size} animated />
          <span>Progress: {formatProgress(this.state.progress)}</span>
        </div>;

      case 'done':
        return <div className="download-page">
          <Arrow dir="down" name={this.state.name} size={this.state.size} />
          <span>Progress: {formatProgress(this.state.progress)}</span>
        </div>;
    }
  }

}
