import Arrow from './Arrow';
import React from 'react';
import UploadActions from '../actions/UploadActions';

export default class UploadPage extends React.Component {

  uploadFile(file) {
    UploadActions.uploadFile(file);
  }

  render() {
    switch (this.props.status) {
      case 'ready':
        return <div>
          <DropZone onDrop={this.uploadFile.bind(this)} />
          <Arrow dir="up" />
        </div>;
        break;

      case 'processing':
        return <div>
          <Arrow dir="up" animated />
          <FileDescription file={this.props.file} />
        </div>;
        break;

      case 'uploading':
        return <div>
          <Arrow dir="up" animated />
          <FileDescription file={this.props.file} />
          <Temaplink token={this.props.token} />
        </div>;
        break;
    }
  }

}
