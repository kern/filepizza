import React from 'react'

export default class Centered extends React.Component {

  render() {
    const h = this.props.hor
    const v = this.props.ver

    if (h && v) {

      return <div style={{
        display: 'table',
        width: '100%',
        height: '100%'}}>
        <div style={{
          display: 'table-cell',
          verticalAlign: 'middle',
          textAlign: 'center'}}>
          <div style={{display: 'inline-block'}}>
            {this.props.children}
          </div>
        </div>
      </div>

    } else if (h && !v) {

      return <div style={{textAlign: 'center'}}>
        <div style={{display: 'inline-block'}}>
          {this.props.children}
        </div>
      </div>

    } else if (!h && v) {

      return <div style={{
        display: 'table',
        width: '100%',
        height: '100%'}}>
        <div style={{
          display: 'table-cell',
          verticalAlign: 'middle'}}>
          {this.props.children}
        </div>
      </div>

    } else {

      return this.props.children

    }
  }

}

Centered.propTypes = {
  hor: React.PropTypes.bool,
  ver: React.PropTypes.bool
}

Centered.defaultProps = {
  hor: false,
  ver: false
}
