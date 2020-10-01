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
  ReactRouter.run(routes, ReactRouter.HistoryLocation, function (Handler) {
    React.render(<Handler data={bootstrap} />, document);
  });

  if (!webrtcSupport.support) SupportActions.noSupport();

  let theme = localStorage.getItem("theme")
  if (theme != "") {
    SupportActions.themeChange(theme)
  } else {
    let prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    SupportActions.themeChange(prefersDark ? "dark" : "light")
  }

  let isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
  if (isChrome) SupportActions.isChrome();
};
