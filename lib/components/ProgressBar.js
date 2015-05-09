import React from 'react'
import classnames from 'classnames'

function formatProgress(dec) {
  return (dec * 100).toPrecision(3) + "%"
}

export default class ProgressBar extends React.Component {

  render() {
    const failed = this.props.value < 0;
    const inProgress = this.props.value < 1 && this.props.value >= 0;
    const classes = classnames('progress-bar', {
      'progress-bar-failed': failed,
      'progress-bar-in-progress': inProgress,
      'progress-bar-small': this.props.small
    })

    const formatted = formatProgress(this.props.value)

    return <div className={classes}>
      {failed
        ? <div className="progress-bar-text">Failed</div>
        : inProgress ? <div
          className="progress-bar-inner"
          style={{width: formatted}}>
          <div className="progress-bar-text">
            {formatted}
          </div>
        </div>
        : <div className="progress-bar-text">Delivered</div>}
      </div>
  }
}

ProgressBar.propTypes = {
  value: React.PropTypes.number.isRequired,
  small: React.PropTypes.bool
}

ProgressBar.defaultProps = {
  small: false
}
