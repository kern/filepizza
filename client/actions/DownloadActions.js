import alt from '../alt';

export default alt.createActions(class DownloadActions {
  constructor() {
    this.generateActions(
      'beginDownload',
      'requestDownload',
      'cancelDownlaod',
      'setDownloadInfo'
    )
  }
})
