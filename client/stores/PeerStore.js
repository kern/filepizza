import PeerActions from '../actions/PeerActions';
import alt from '../alt';

export default alt.createStore(class PeerStore {

  constructor() {
    this.bindActions(PeerActions);
    this.peerID = null;
  }

  onSetPeerID(id) {
    this.peerID = id;
  }

  static getPeerID() {
    return this.getState().peerID;
  }

})
