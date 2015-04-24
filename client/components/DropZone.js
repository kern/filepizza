import React from 'react'
import Centered from './Centered'

export default class DropZone extends React.Component {

  constructor() {
    this.state = { focus: false }
  }

  onDragEnter() {
    this.setState({ focus: true })
  }

  onDragLeave(e) {
    if (e.target !== this.refs.overlay.getDOMNode()) return
    this.setState({ focus: false })
  }

  onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  onDrop(e) {
    e.preventDefault()
    this.setState({ focus: false })

    let file = e.dataTransfer.files[0]
    if (this.props.onDrop && file) this.props.onDrop(file)
  }

  render() {
    return <div className="drop-zone" ref="root"
      onDragEnter={this.onDragEnter.bind(this)}
      onDragLeave={this.onDragLeave.bind(this)}
      onDragOver={this.onDragOver.bind(this)}
      onDrop={this.onDrop.bind(this)}>

      <div className="drop-zone-overlay"
        hidden={!this.state.focus}
        ref="overlay" />

      {this.props.children}

    </div>
  }

}

DropZone.propTypes = {
  onDrop: React.PropTypes.func.isRequired
}
