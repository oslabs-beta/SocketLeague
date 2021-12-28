const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const ws = require('ws');
const path = require("path");

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/',
(req, res) => {
  res.sendFile(path.resolve(__dirname, '../index.html'));
}
);

app.get('/bundle.js',
(req, res) => {
  res.sendFile(path.resolve(__dirname, '../build/bundle.js'));
}
);

app.use((req, res) => {
    res.sendStatus(404);
});

app.use((err, req, res, next) =>{
    console.log(err);
    res.status(500).send(`Internal Server Error: ${err.message}`)
});

const clients = [];

function handleWsConnection(socket) {
  clients.push(socket);
  console.log('Somebody connected to the websocket server');  
  socket.on('message', message => {
    console.log(`Got a message: ${message}`);
    for (const client of clients) {
      client.send(message);
    }
  });
}

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', handleWsConnection);

httpServer = app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));

httpServer.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request);
  });
});
