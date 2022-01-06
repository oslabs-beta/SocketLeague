import React from 'react';
import { render } from 'react-dom';
import App from './App.jsx';
import '../style.scss';

// const ws = require('ws');

// const client = new ws('ws://localhost:3000');

// client.on('open', () => {
//   // Causes the server to print "Hello"
//   client.send('Hello');
// });

const socket = new WebSocket('ws://localhost:3000');

render(
  <App />,
  document.getElementById('root')
);
