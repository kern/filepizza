import React from 'react';
import classnames from 'classnames';

export default class DropZone extends React.Component {

  constructor() {
    this.state = { focus: false };
  }

  onDragEnter() {
    this.setState({ focus: true });
  }

  onDragLeave() {
    this.setState({ focus: false });
  }

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  onDrop(e) {
    e.preventDefault();
    this.setState({ focus: false });

    let file = e.dataTransfer.files[0];
    if (this.props.onDrop && file) this.props.onDrop(file);
  }

  render() {
    let classes = classnames('drop-zone', {
      'drop-zone-focus': this.state.focus
    });

    return <div className={classes}
      onDragEnter={this.onDragEnter.bind(this)}
      onDragLeave={this.onDragLeave.bind(this)}
      onDragOver={this.onDragOver.bind(this)}
      onDrop={this.onDrop.bind(this)} />;
  }

}
