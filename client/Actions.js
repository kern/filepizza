import alt from './alt';

export default alt.createActions(class Actions {
  constructor() {
    this.generateActions(
      'download',
      'receiveData',
      'requestDownload',
      'setDownloadInfo',
      'sendToDownloader',
      'updatePeerID',
      'updateToken',
      'upload'
    )
  }
})
