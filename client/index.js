import App from './components/App';
import React from 'react';
import DownloadActions from './actions/DownloadActions';

if (window.WebDrop) DownloadActions.setDownloadInfo({
  token: window.WebDrop.token,
  name: window.WebDrop.metadata.name,
  size: window.WebDrop.metadata.size,
  type: window.WebDrop.metadata.type
})

React.render(<App />, document.getElementById('app'));
