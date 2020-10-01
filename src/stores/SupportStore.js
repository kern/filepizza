import SupportActions from '../actions/SupportActions'
import alt from '../alt'

export default alt.createStore(class SupportStore {

  constructor() {
    this.bindActions(SupportActions)
    this.isSupported = true
    this.isChrome = false
    this.theme = "light"
  }

  onNoSupport() {
    this.isSupported = false
  }

  onIsChrome() {
    this.isChrome = true
  }

  onThemeChange(theme) {
    localStorage.setItem("theme", theme)
    this.theme = theme
  }
}, 'SupportStore')
