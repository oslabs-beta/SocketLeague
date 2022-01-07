import React from 'react';
import { render } from 'react-dom';
import App from './App.jsx';
import { Connection } from 'socket-league-client';

const conn = Connection('ws://localhost:3000');

render(
  <App conn={conn} />,
  document.getElementById('root')
);
