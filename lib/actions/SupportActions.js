import alt from '../alt'

export default alt.createActions(class SupportActions {
  constructor() {
    this.generateActions(
      'isChrome',
      'noSupport'
    )
  }
})
