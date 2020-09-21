import React from 'react'
import DownloadStore from '../stores/DownloadStore'
import SupportStore from '../stores/SupportStore'

function getState() {
  return {
    active: SupportStore.getState().isChrome && DownloadStore.getState().fileSize >= 500000000
  }
}

export default class ChromeNotice extends React.Component {

  constructor() {
    super()
    this.state = getState()

    this._onChange = () => {
      this.setState(getState())
    }
  }

  componentDidMount() {
    DownloadStore.listen(this._onChange)
    SupportStore.listen(this._onChange)
  }

  componentWillUnmount() {
    DownloadStore.unlisten(this._onChange)
    SupportStore.unlisten(this._onChange)
  }

  render() {
    if (this.state.active) {
      return <p className="notice">Chrome has issues downloading files > 500 MB. Try using Firefox instead.</p>
    } else {
      return null
    }
  }

}
