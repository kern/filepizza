import "babel-polyfill";
import "./index.styl";
import React from "react";
import ReactRouter from "react-router";
import webrtcSupport from 'webrtcsupport';
import routes from './routes';
import alt from './alt';
import SupportActions from "./actions/SupportActions";

const bootstrap = document.getElementById("bootstrap").innerHTML;
alt.bootstrap(bootstrap);

window.FilePizza = () => {
  ReactRouter.run(routes, ReactRouter.HistoryLocation, Handler => {
    React.render(<Handler data={bootstrap} />, document);
  })
  if (!webrtcSupport.support) {
    SupportActions.noSupport();
  }

  const isChrome = navigator.userAgent.toLowerCase().includes('chrome')
;if (isChrome) {
    SupportActions.isChrome()
  }
};
