import ErrorStore from '../stores/ErrorStore'
import React from 'react'

export default class ErrorPage extends React.Component {

  constructor() {
    this.state = ErrorStore.getState()

    this._onChange = () => {
      this.setState(ErrorStore.getState())
    }
  }

  componentDidMount() {
    ErrorStore.listen(this._onChange)
  }

  componentDidUnmount() {
    ErrorStore.unlisten(this._onChange)
  }

  render() {
    return <div>
      <h1>{this.state.status}</h1>
      <p>{this.state.message}</p>

      {this.state.stack
        ? <pre>{this.state.stack}</pre>
        : null}

    </div>
  }

}
