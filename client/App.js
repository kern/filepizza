import DropZone from './DropZone';
import FileDescription from './FileDescription';
import React from 'react';
import Tempalink from './Tempalink';
import socket from './socket';
import Actions from './Actions';
import Store from './Store';

export default class App extends React.Component {

  constructor() {

    this.state = Store.getState();
    this._onChange = function() {
      this.setState(Store.getState());
    }.bind(this);

  }

  componentDidMount() {
    Store.listen(this._onChange);
  }

  componentDidUnmount() {
    Store.unlisten(this._onChange);
  }

  uploadFile(file) {
    Actions.upload(file);
  }

  downloadFile() {
    Actions.requestDownload();
  }

  render() {
    if (this.state.readyToUpload) {
      return (
        <div>
          <FileDescription file={this.state.uploadFile} />
          <Tempalink token={this.state.uploadToken} />
        </div>
      );

    } else if (this.state.readyToDownload) {
      return (
        <div>
          <FileDescription file={this.state.downloadMetadata} />
          <button onClick={this.downloadFile.bind(this)}>Download</button>
        </div>
      );
    } else {
      return <DropZone onDrop={this.uploadFile.bind(this)} />;
    }
  }

}
