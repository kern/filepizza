import React from 'react'
import classnames from 'classnames'

function formatProgress(dec) {
  return (dec * 100).toPrecision(3) + "%"
}

export default class ProgressBar extends React.Component {

  render() {
    const failed = this.props.value < 0;
    const classes = classnames('progress-bar', {
      'progress-bar-failed': failed
    })

    const formatted = formatProgress(this.props.value)

    return <div className={classes}>
      {failed
        ? <div className="progress-bar-text">Failed</div>
        : <div
          className="progress-bar-inner"
          style={{width: formatted}}>
          <div className="progress-bar-text">
            {formatted}
          </div>
        </div>}
      </div>
  }
}

ProgressBar.propTypes = {
  value: React.PropTypes.number.isRequired
}
