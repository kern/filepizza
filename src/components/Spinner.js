import React from 'react'
import classnames from 'classnames'
import { formatSize } from '../util'

export default class Spinner extends React.Component {

  render() {
    const classes = classnames('spinner', {
      'spinner-animated': this.props.animated
    })

    return <div className={classes}>
      <img
        alt={this.props.name || this.props.dir}
        src={`/images/${this.props.dir}.png`}
        className="spinner-image" />

      {this.props.name === null ? null
        : <div className="spinner-name">{this.props.name}</div>}
      {this.props.size === null ? null
        : <div className="spinner-size">{formatSize(this.props.size)}</div>}
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
