import React from 'react';

export default class FileDescription extends React.Component {

  render() {
    return (
      <div className="file-description">
        <span className="file-name">{this.props.file.name}</span>
        <span className="file-size">{this.props.file.size}</span>
        <span className="file-type">{this.props.file.type}</span>
      </div>
    );
  }

}
