import React from 'react'
import QRCode from 'react-qr'

export default class Tempalink extends React.Component {
  constructor() {
    super()
    this.onClick = this.onClick.bind(this)
  }

  onClick() {
    this.refs.input.getDOMNode().setSelectionRange(0, 9999)
  }

  render() {
    var url = window.location.origin + '/' + this.props.token
    return <div className="tempalink">
      <input
        onClick={this.onClick}
        readOnly
        ref="input"
        type="text"
        value={url} />

        <QRCode text={url} />
    </div>
  }

}
