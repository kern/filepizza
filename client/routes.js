import React from 'react';
import { Route, DefaultRoute, NotFoundRoute, RouteHandler } from 'react-router';

import App from './components/App';
import DownloadPage from './components/DownloadPage';
import UploadPage from './components/UploadPage';
import NotFoundPage from './components/NotFoundPage';

export default (
  <Route handler={App}>
    <DefaultRoute handler={UploadPage} />
    <Route name="download" path="d/:token" handler={DownloadPage} />
    <NotFoundRoute handler={NotFoundPage} />
  </Route>
);
