import App from './App';
import React from 'react';
import Actions from './Actions';

if (window.WebDrop) Actions.setDownloadInfo(window.WebDrop);
React.render(<App />, document.getElementById('app'));
