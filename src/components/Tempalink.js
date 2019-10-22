import React from 'react'
import QRCode from 'react-qr'

export default class Tempalink extends React.Component {
  constructor() {
    super()
    this.onClick = this.onClick.bind(this)
  }

  onClick(e) {
    e.target.setSelectionRange(0, 9999)
  }

  render() {
    var url = window.location.origin + '/' + this.props.token
    var shortUrl = window.location.origin + '/download/' + this.props.shortToken

    return <div className="tempalink">
      <div className="qr">
        <QRCode text={url} />
      </div>
      <div className="urls">
        <div className="long-url">
          <input
            onClick={this.onClick}
            readOnly
            type="text"
            value={url} />
        </div>

        <div className="short-url">
          or, for short: <span>{shortUrl}</span>
        </div>
      </div>
    </div>
  }

}
