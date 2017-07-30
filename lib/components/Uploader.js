import Arrow from '@app/components/Arrow';
import React from 'react';
import UploadActions from '@app/actions/UploadActions';

export default class UploadPage extends React.Component {
  constructor() {
    super()
    this.uploadFile = this.uploadFile.bind(this)
  }

  uploadFile(file) {
    UploadActions.uploadFile(file);
  }

  render() {
    switch (this.props.status) {
      case 'ready':
        return <div>
          <DropZone onDrop={this.uploadFile} />
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
