import DownloadActions from '../actions/DownloadActions';
import DownloadStore from '../stores/DownloadStore';
import DropZone from './DropZone';
import FileDescription from './FileDescription';
import Header from './Header';
import PeerStore from '../stores/PeerStore';
import React from 'react';
import Tempalink from './Tempalink';
import UploadActions from '../actions/UploadActions';
import UploadStore from '../stores/UploadStore';

function getState() {
  return {
    peerID: PeerStore.getPeerID(),
    readyToUpload: UploadStore.getState().status.isUploading(),
    uploadFile: UploadStore.getState().file,
    uploadToken: UploadStore.getState().token,
    downloadFile: DownloadStore.getState().file,
    downloadToken: DownloadStore.getState().token,
    readyToDownload: DownloadStore.getState().status.isReady()
  };
}

export default class App extends React.Component {

  constructor() {

    this.state = getState();
    this._onChange = function() {
      this.setState(getState());
    }.bind(this);

  }

  componentDidMount() {
    PeerStore.listen(this._onChange);
    UploadStore.listen(this._onChange);
    DownloadStore.listen(this._onChange);
  }

  componentDidUnmount() {
    PeerStore.unlisten(this._onChange);
    UploadStore.unlisten(this._onChange);
    DownloadStore.unlisten(this._onChange);
  }

  uploadFile(file) {
    UploadActions.uploadFile(file);
  }

  downloadFile() {
    DownloadActions.requestDownload();
  }

  render() {
    if (this.state.readyToUpload) {
      return <div>
        <Header />
        <FileDescription file={this.state.uploadFile} />
        <Tempalink token={this.state.uploadToken} />
      </div>;
    } else if (this.state.readyToDownload) {
      return <div>
        <Header />
        <FileDescription file={this.state.downloadFile} />
        <button onClick={this.downloadFile.bind(this)}>Download</button>
      </div>;
    } else {
      return <div>
        <Header />
        <DropZone onDrop={this.uploadFile.bind(this)} />
      </div>;
    }
  }

}
