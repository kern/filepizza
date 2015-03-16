import DropZone from './DropZone';
import FileDescription from './FileDescription';
import React from 'react';
import Tempalink from './Tempalink';
import socket from './socket';
import upload from './upload';
import download from './download';

export default class App extends React.Component {

  constructor() {

    super();
    this.state = { token: null, file: null };

    var self = this;
    socket.on('token', function (t) {
      self.setState({ token: t });
    });

    socket.on('download', function (t) {
      if (self.state.file) upload(self.state.file, t);
    });

    socket.on('upload', function (data) {
      download(window.metadata.name, new Blob([data]));
    });

    if (window.token) socket.emit('download', window.token);

  }

  useFile(file) {
    this.setState({ file: file });

    socket.emit('update', {
      name: file.name,
      size: file.size,
      type: file.type
    });
  }

  render() {
    if (this.state.file) {
      return (
        <div>
          <FileDescription file={this.state.file} />
          <Tempalink token={this.state.token} />
        </div>
      );
    } else {
      return <DropZone onDrop={this.useFile.bind(this)} />;
    }
  }
}
