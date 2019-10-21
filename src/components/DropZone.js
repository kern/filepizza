import React from 'react'

export default class DropZone extends React.Component {

  constructor() {
    super()
    this.state = { focus: false }

    this.onDragEnter = this.onDragEnter.bind(this)
    this.onDragLeave = this.onDragLeave.bind(this)
    this.onDragOver = this.onDragOver.bind(this)
    this.onDrop = this.onDrop.bind(this)
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
      onDragEnter={this.onDragEnter}
      onDragLeave={this.onDragLeave}
      onDragOver={this.onDragOver}
      onDrop={this.onDrop}>

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
