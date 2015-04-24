import alt from '../alt'

export default alt.createStore(class ErrorStore {

  constructor() {
    this.status = 404
    this.message = 'Not Found'
  }

}, 'ErrorStore')
