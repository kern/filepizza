import alt from '../alt'

export default alt.createActions(class DownloadActions {
  constructor() {
    this.generateActions(
      'requestDownload'
    )
  }
})
