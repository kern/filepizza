import React from 'react'

export default class Centered extends React.Component {

  render() {
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: '100%'}}>
      <div>
        {this.props.children}
      </div>
    </div>
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
