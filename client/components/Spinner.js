import React from 'react'
import classnames from 'classnames'

// Taken from StackOverflow
// http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i]
}

export default class Spinner extends React.Component {

  render() {
    const classes = classnames('spinner', {
      'spinner-animated': this.props.animated
    })

    return <div className={classes}>

      <div className="spinner-border" />

      <div className="spinner-content">

        <img
          alt={this.props.name || this.props.dir}
          src={`/images/${this.props.dir}.png`}
          className="spinner-image" />

        {this.props.name === null ? null
          : <div className="spinner-name">{this.props.name}</div>}
        {this.props.size === null ? null
          : <div className="spinner-size">{formatSize(this.props.size)}</div>}

      </div>

    </div>
  }

}

Spinner.propTypes = {
  dir: React.PropTypes.oneOf(['up', 'down']).isRequired,
  name: React.PropTypes.string,
  size: React.PropTypes.number,
  animated: React.PropTypes.bool
}

Spinner.defaultProps = {
  name: null,
  size: null,
  animated: false
}
