const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const ws = require("ws");
const path = require("path");
const SyncHandler = require('./syncHandler.js');
// const sl = require("socket-league");

//initialize syncState with the URI of the database where the state is stored (ZL 12.29)
// const syncState = new sl.SyncHandler(process.env.DB_URI);
const syncState = new SyncHandler(process.env.DB_URI);

//temporary: directly database into the websocket server
const db = require("./models/clientModel.js");

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

/*
Probably at this point we would initialize a sync state object from our library, which has the state link in the DB there
*/

function handleWsConnection(socket) {

  syncState.addSocket(socket);
  console.log("Somebody connected to the websocket server");

  //we need to customize how state is transmitted to handle different use cases
  //right now message comes in as a string
  socket.on("message", (message) => {

    //we can put the synchandler here
    syncState.handleState(message);
    //UNDO: send delete to the DB
  //   if (stateChange.action === "undo") {
  //     console.log(`Got an undo request: ${message}`);
  //     //we need this to be the deletion of a record
  //     //for now, we'll just delete the latest state, and then send a chronologically junior state to the client
  //     db.findOneAndDelete(
  //       { session: "0" },
  //       { sort: { _id: -1 } } //pray that this will delete the latest record for us with no issues
  //     ).catch((err) => {
  //       console.log("Error in undo", err);
  //     });
  //     //transmit the updated state here
  //     for (const client of clients) {
  //       //TODO: integrate mongoDB here
  //       const sessionRecords = db.find({ session: "0" }).catch((err) => {
  //         console.log("undo", err);
  //       });
  //       client.send(sessionRecords[0].state);
  //     }
  //   }

  //   //REDO: get the next chronologically advanced state from the db and send to client
  //   //stretch feature, do not implement
  //   if (stateChange.action === "redo") {
  //   }

  //     //On initial communication to the server:
  // //client starts either with a blank session ID or another session ID pre-provided somehow
  // //the server checks to see if this session ID already exists
  // //if it does, the server replies with the state for that session ID, connecting the client to that session
  // //if it does not, the server saves the received state.
  // //it then replies with the state and generates a new session Id it sends to the client (overwrites whatever session ID the client had before)
  //   if (stateChange.action === "initial") {
  //     console.log(`Got an initial message: ${message}`);
  //     //check the db for the session id associated with the message
  //     db.find({ session: stateChange.session }).then(
  //       (data) => {
  //         if (data) {
  //           //if there is a session id, send that state to EVERY client
  //           console.log('data is')
  //           console.log(data);
  //           for (const client of clients) {
  //                 // console.log (sessionRecords[sessionRecords.length-1],sessionRecords.length);
  //                 client.send(
  //                   JSON.stringify(
  //                     data[data.length - 1].state
  //                   )
  //                 ); //state is a list of messages [msg1, msg2, msg3]
  //               }
  //         } else {
  //           //if there's no session id, create a new db entry
  //           db.create({ session: "0", state: state })
  //             .then((data) => {
  //               console.log("the data is ", data);
  //               for (const client of clients) {
  //                 // console.log (sessionRecords[sessionRecords.length-1],sessionRecords.length);
  //                 client.send(
  //                   JSON.stringify(
  //                     data.state
  //                   )
  //                 ); //state is a list of messages [msg1, msg2, msg3]
  //               }
  //             })
  //             .catch((err) => {
  //               console.log("Error in create initial", err);
  //             });
  //         }
  //       }
  //     );
  //   }

  //   //UPDATE:
    // if (stateChange.action === "update") {
    //   console.log(`Got an update message: ${message}`);
    //   //add new messages to the list of all messages
    //   //TODO: integrate mongoDB here
    //   state.push(stateChange.state);
    //   console.log("state Change is ", stateChange);
    //   console.log(state);

    //   //we need this to create a new entry, not update!
    //   db.create({ session: "0", state: state })
    //     .then((data) => {
    //       console.log("the data is ", data);
    //       for (const client of clients) {
    //         //TODO: integrate mongoDB here
    //         db.find({ session: "0" })
    //           .then((sessionRecords) => {
    //             // console.log (sessionRecords[sessionRecords.length-1],sessionRecords.length);
    //             client.send(
    //               JSON.stringify(
    //                 sessionRecords[sessionRecords.length - 1].state
    //               )
    //             ); //state is a list of messages [msg1, msg2, msg3]
    //           })
    //           .catch((err) => {
    //             console.log("Error in finding session", err);
    //           });
    //       }
    //     })
    //     .catch((err) => {
    //       console.log("Error in update", err);
    //     });
    // }
  });
}

//we initialize the websocket server, which is separate from the http express server
const wsServer = new ws.Server({ noServer: true });

//we specify that when the connection state is reached by the websocket server, we will invoke handleWsConnection (see function above)
wsServer.on("connection", handleWsConnection);

httpServer = app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));

//
httpServer.on("upgrade", (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  });
});
