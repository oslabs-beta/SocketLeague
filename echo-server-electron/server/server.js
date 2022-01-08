const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const ws = require("ws");
const path = require("path");
const SyncHandler = require("socket-league-server");

//initialize syncState with the URI of the database where the state is stored
console.log("Confirm SyncHandler Server Import: ", SyncHandler);
const syncState = new SyncHandler.SyncHandler(process.env.DB_URI);
syncState.connect();

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/build", express.static(path.resolve(__dirname, "../build")));
app.use("/assets", express.static(path.resolve(__dirname, "../assets")));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../index.html"));
});

app.get("/bundle.js", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../build/bundle.js"));
});

app.use((req, res) => {
  res.sendStatus(404);
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send(`Internal Server Error: ${err.message}`);
});

//we initialize the websocket server, which is separate from the http express server
const wsServer = new ws.Server({ noServer: true });

//we specify that when the connection state is reached by the websocket server, we will invoke handleWsConnection (see function above)
wsServer.on("connection", syncState.handleWsConnection);

httpServer = app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));

httpServer.on("upgrade", (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  });
});
