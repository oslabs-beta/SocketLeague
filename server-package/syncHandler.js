//temporary: directly database into the websocket server
const db = require("./models/clientModel.js");
// import db from "./models/clientModel.js";
const mongoose = require("mongoose");

//eventually we need to export stuff

//do all the database calls in here
//store the state in here

//refactor by making it its own file
const types = {
  UPDATE: "update",
  INITIAL: "initial",
  UNDO: "undo",
  REDO: "redo",
};

//the schema has to be specified in here too, then
module.exports = class SyncHandler {
  //method to ask user for URI or have it initialized when the object is created
  constructor(uri) {
    // this.clients = [];
    this.sessions = {};
    this.dbUri = uri;
    this.handleWsConnection = (socket) =>{
      console.log("Somebody connected to the websocket server");
      socket.on("message", (message) => {
        this.handleState(message, socket);
      });
    }
  }

  //If no URI is specified, just use the URI specified on initialization
  //otherwise, set a new URI and connect
  async connect(uri) {
    if (uri) this.dbUri = uri;
    await mongoose.connect(this.dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  // "{action: undo || update || initial, state: state, session ID}"
  //client sends object with 'action' property and 'state' property
  //server sends 'state' and the 'session' only?
  handleState(message, socket) {
    function sendStateUpdate(record, client) {
      client.send(
        JSON.stringify({ state: record.state, session: record.session })
      );
    }
    //parse the message into a json object
    const stateChange = JSON.parse(message); //message.json(); //stateChange will be an object now

    /*  INITIAL:
            This is for initial connection to an existing session or to a new session.
            If the stateChange action is 'initial', first check for an existing session ID associated with the message. 
            If it exists, the server connects the client to the existing state.
            If the session ID does not exist, a new one is created and a new database entry is also created.
            Only clients with the right session ID receive updates
      */
    if (stateChange.action === "initial") {
      console.log(`Got an initial message: ${message}`);
      db.find({ session: stateChange.session }).then((data) => {
        if (data.length > 0) {
          if (this.sessions[stateChange.session]) {
            this.sessions[stateChange.session].add(socket);
          } else {
            this.sessions[stateChange.session] = new Set();
            this.sessions[stateChange.session].add(socket);
          }
          for (const client of this.sessions[stateChange.session]) {
            sendStateUpdate(data[data.length - 1], client);
          }
        } else {
          db.create({ session: stateChange.session, state: stateChange.state })
            .then((data) => {
              if (this.sessions[stateChange.session]) {
                this.sessions[stateChange.session].add(socket);
              } else {
                this.sessions[stateChange.session] = new Set();
                this.sessions[stateChange.session].add(socket);
              }
              for (const client of this.sessions[stateChange.session]) {
                sendStateUpdate(data, client);
              }
            })
            .catch((err) => {
              console.log("Error in create initial", err);
            });
        }
      });
    }

    /*  UPDATE:
          This is for updating the state between clients. 
          If there is an 'update' action, Create new state in the database.
          Find all the clients that are sharing the same session ID, and update their current to the new state. 
      */
    if (stateChange.action === "update") {
      // console.log(`Got an update message:`);
      console.log(`Got an update message: ${message}`);
      //add new messages to the list of all messages
      //we need this to create a new entry
      db.create({ session: stateChange.session, state: stateChange.state })
        .then((data) => {
          //redundant because we have the record we just added but search the database for the latest record anyway
          //logic for sending updated state to clients needs refactoring
          for (const client of this.sessions[stateChange.session]) {
            db.find({ session: stateChange.session })
              .then((sessionRecords) => {
                sendStateUpdate(
                  sessionRecords[sessionRecords.length - 1],
                  client
                );
              })
              .catch((err) => {
                console.log("Error in finding session", err);
              });
          }
        })
        .catch((err) => {
          console.log("Error in update", err);
        });
    }

    /*  UNDO:
            This is for 'undoing' an action or reverting to a previous state.
            If the stateChange action is 'undo', we apply method findOneAndDelete. This will search for the latest state stored in the
            database and delete it. The last record before the one deleted will be sent out to all clients and become the current state.
      */
    if (stateChange.action === "undo") {
      console.log(`Got an undo message: ${message}`);
      db.find({ session: stateChange.session })
        .then((data) => {
          if (data.length > 1) {
            // console.log(data[data.length - 1]._id, " will be deleted.");
            db.findOneAndDelete({ _id: data[data.length - 1]._id }).then(
              (data) => {
                console.log(data._id, "was deleted");
                for (const client of this.sessions[stateChange.session]) {
                  //TODO: error handle for if the array is empty later
                  db.find({ session: stateChange.session })
                    .then((sessionRecords) => {
                      sendStateUpdate(
                        sessionRecords[sessionRecords.length - 1],
                        client
                      );
                    })
                    .catch((err) => {
                      console.log("Error in finding session for undo", err);
                    });
                }
              }
            );
          }
        })
        .catch((err) => {
          console.log("Error in undo", err);
        });
    }

    /*  REDO: **feature not yet functional**
          This is for 'redoing' an undo.
          If the stateChange action is 'redo', the recently deleted or undone state will be reverted. This reverted state will then
          be sent to all clients and their current state will also be the reverted state.
      */
    if (stateChange.action === "redo") {
    }
  }
  async clearState() {
    const sessionRecords = await db.find();
    if (sessionRecords.length) {
      await db.collection.drop();
    }
  }
  __getDB() {
    return db;
  }

  close() {
    mongoose.connection.close();
  }
};



//
