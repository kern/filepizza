import ErrorStore from '../stores/ErrorStore'
import React from 'react'
import Spinner from './Spinner'

export default class ErrorPage extends React.Component {

  constructor() {
    super()
    this.state = ErrorStore.getState()

    this._onChange = () => {
      this.setState(ErrorStore.getState())
    }
  }

  componentDidMount() {
    ErrorStore.listen(this._onChange)
  }

  componentWillUnmount() {
    ErrorStore.unlisten(this._onChange)
  }

  render() {
    return <div className="page">

      <Spinner dir="up" />

      <h1 className="with-subtitle">FilePizza</h1>
      <p className="subtitle">
        <strong>{this.state.status}:</strong> {this.state.message}
      </p>

      {this.state.stack
        ? <pre>{this.state.stack}</pre>
        : null}

    </div>
  }

}
