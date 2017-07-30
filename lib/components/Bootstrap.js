import React from 'react'

export default class Bootstrap extends React.Component {

  render() {
    return <script
      id="bootstrap"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: this.props.data}} />
  }

}
