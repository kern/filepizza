import React from 'react'

export default class Tempalink extends React.Component {

  onClick() {
    this.refs.input.getDOMNode().setSelectionRange(0, 9999)
  }

  render() {
    var url = window.location.origin + '/' + this.props.token
    if (url.length > 7 && url.indexOf("http://") == 0) {
      url = url.substring(7);
    }
    return <input
      className="tempalink"
      onClick={this.onClick.bind(this)}
      readOnly
      ref="input"
      type="text"
      value={url} />
  }

}
