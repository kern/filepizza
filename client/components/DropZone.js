import React from 'react';

export default class DropZone extends React.Component {

  dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  drop(e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    this.props.onDrop(file);
  }

  render() {
    return <div className="drop-zone"
      onDragOver={this.dragOver.bind(this)}
      onDrop={this.drop.bind(this)}>
      Drop a file here.
    </div>;
  }

}
