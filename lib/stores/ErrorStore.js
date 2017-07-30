import SupportActions from '../actions/SupportActions'
import alt from '../alt'

export default alt.createStore(class ErrorStore {

  constructor() {
    this.bindActions(SupportActions)

    this.status = 404
    this.message = 'Not Found'
    this.stack = null
  }

  onNoSupport() {
    this.status = 400
    this.message = 'No WebRTC Support. Please use Chrome or Firefox.'
    this.stack = null
  }

}, 'ErrorStore')