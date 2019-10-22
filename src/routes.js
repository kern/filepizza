import React from 'react'
import { Route, DefaultRoute, NotFoundRoute, RouteHandler } from 'react-router'

import App from './components/App'
import DownloadPage from './components/DownloadPage'
import UploadPage from './components/UploadPage'
import ErrorPage from './components/ErrorPage'

export default (
  <Route handler={App}>
    <DefaultRoute handler={UploadPage} />
    <Route name="download" path="/:a/:b/:c/:d" handler={DownloadPage} />
    <Route name="download-short" path="/download/:a" handler={DownloadPage} />
    <Route name="error" path="error" handler={ErrorPage} />
    <NotFoundRoute handler={ErrorPage} />
  </Route>
)

