import React from 'react'

export default class DownloadButton extends React.Component {

  onClick(e) {
    this.props.onClick(e)
  }

  render() {
    return <button
      className="download-button"
      onClick={this.onClick.bind(this)}>
      Download
    </button>
  }

}

DownloadButton.propTypes = {
  onClick: React.PropTypes.func.isRequired
}
