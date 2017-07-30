import "babel-polyfill";
import "./index.styl";
import React from "react";
import ReactRouter from "react-router";
import routes from "./routes";
import alt from "./alt";
import webrtcSupport from "webrtcsupport";
import SupportActions from "./actions/SupportActions";

let bootstrap = document.getElementById("bootstrap").innerHTML;
alt.bootstrap(bootstrap);

window.FilePizza = () => {
  ReactRouter.run(routes, ReactRouter.HistoryLocation, function(Handler) {
    React.render(<Handler data={bootstrap} />, document);
  });

  if (!webrtcSupport.support) SupportActions.noSupport();

  let isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
  if (isChrome) SupportActions.isChrome();
};
