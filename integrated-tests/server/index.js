require('dotenv').config();

const path = require('path');
const process = require('process');

const express = require('express');
const ws = require('ws');

const { SyncHandler } = require('socket-league-server');


const PORT = 3000;

const startServer = async () => {
  const app = express();
  app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/index.html'));
  });

  app.get('/bundle.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../build/bundle.js'));
  });

  syncState = new SyncHandler(process.env.DB_URI);

  const wsServer = new ws.Server({ noServer: true });
  wsServer.on('connection', syncState.handleWsConnection);

  const httpServer = app.listen(PORT, () => {console.log(`Listening on port ${PORT}`)});
  httpServer.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (socket) => {
      wsServer.emit('connection', socket, request);
    });
  });

  await syncState.connect();
  return { httpServer, wsServer, syncState };
};

module.exports = startServer;
