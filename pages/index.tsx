import React from 'react';
import ReactDOM from 'react-dom';
import { EventDispatcher } from "peer-data";
import { PeerDataProvider } from 'react-peer-data';

import App from './App';

const IndexPage = () => {
  return <PeerDataProvider
    servers={{ iceServers: [{ url: "stun:stun.1.google.com:19302" }] }}
    constraints={{ ordered: true }}
    signaling={{ dispatcher: new EventDispatcher() }}
  >
    <App />
  </PeerDataProvider>,
}

export default IndexPage
