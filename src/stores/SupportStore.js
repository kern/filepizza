import SupportActions from '../actions/SupportActions'
import alt from '../alt'

export default alt.createStore(class SupportStore {

  constructor() {
    this.bindActions(SupportActions)
    this.isSupported = true
    this.isChrome = false
  }

  onNoSupport() {
    this.isSupported = false
  }

  onIsChrome() {
    this.isChrome = true
  }

}, 'SupportStore')
