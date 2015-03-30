// TODO: Rename this.

import React from 'react';
import classnames from 'classnames';

// Taken from StackOverflow
// http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1000;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}

export default class Arrow extends React.Component {

  render() {
    let classes = classnames('arrow', {
      'arrow-up': this.props.dir === 'up',
      'arrow-down': this.props.dir === 'down',
      'arrow-animated': this.props.animated
    });

    return <div className={classes}>

      <div className="arrow-border" />
      <div className="arrow-image">{this.props.dir === 'up' ? '^' : 'v'}</div>

      {this.props.name === null ? null
        : <div className="arrow-name">{this.props.name}</div>}
      {this.props.size === null ? null
        : <div className="arrow-size">{formatSize(this.props.size)}</div>}

    </div>;
  }

}

Arrow.propTypes = {
  dir: React.PropTypes.oneOf(['up', 'down']).isRequired,
  name: React.PropTypes.string,
  size: React.PropTypes.number,
  animated: React.PropTypes.bool
};

Arrow.defaultProps = {
  name: null,
  size: null,
  animated: false
};
