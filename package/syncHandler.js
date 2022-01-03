//temporary: directly database into the websocket server
// const db = require("./models/clientModel.js");
import db from "./models/clientModel.js";
import mongoose from 'mongoose';


//eventually we need to export stuff

//do all the database calls in here
//store the state in here

//refactor by making it its own file
const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

//the schema has to be specified in here too, then
// module.exports = class SyncHandler {
  export default class SyncHandler {
  //method to ask user for URI or have it initialized when the object is created
  constructor(uri) {
    this.clients = [];
    mongoose
      .connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log("SyncHandler connected to MongoDB"))
      .catch((err) => console.log(err));
  }
  
  // "{action: undo || update || initial, state: state, session ID}"
    //client sends object with 'action' property and 'state' property
    //server sends 'state' and the 'session' only?
  handleState(message) {
    //parse the message into a json object?
    const stateChange = JSON.parse(message); //message.json(); //stateChange will be an object now

    //stateChange has: session ID, state object with properties corresponding to parts of the state, and an action
    //handle websocket connection events (initial, undo, update)  
    /*  INITIAL:
          This is for initial connection to an existing session or to a new session.
          If the stateChange action is 'initial', first check for an existing session ID associated with the message. 
          If it exists, the server connects the client to the existing state.
          If the session ID does not exist, a new one is created and a new database entry is also created.

          Future updates:
          - refactor for of loop to send to only certain clients
          - create a unique session ID
    */
    if (stateChange.action === "initial") {
      console.log(`Got an initial message: ${message}`);
      db.find({ session: stateChange.session }).then((data) => {
        if (data) {
          for (const client of this.clients) {
            client.send(JSON.stringify(data[data.length - 1].state));
          }
        } else {
          //creating a new session with whatever state the client gives us
          //we assume the client knows how to handle whatever state we give back
          db.create({ session: "0", state: stateChange.state })
            .then((data) => {
              for (const client of this.clients) {
                client.send(JSON.stringify(data.state));
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
      console.log(`Got an update message: ${message}`);
      //add new messages to the list of all messages
      console.log("state Change is ", stateChange);

      //we need this to create a new entry, not update!
      db.create({ session: stateChange.session, state: stateChange.state })
        .then((data) => { 
          //redundant because we have the record we just added but search the database for the latest record anyway
          //logic for sending updated state to clients needs refactoring 
          for (const client of this.clients) {
            db.find({ session: stateChange.session })
              .then((sessionRecords) => {
                client.send(
                  JSON.stringify(
                    sessionRecords[sessionRecords.length - 1].state
                  )
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
      console.log(`Got an undo request: ${message}`);
      db.findOneAndDelete(
        { session: "0" },
        { sort: { _id: -1 } }
      ).catch((err) => {
        console.log("Error in undo", err);
      });
      for (const client of this.clients) {
        //TODO: error handle for if the array is empty later
        db.find({ session: stateChange.session })
          .then((sessionRecords) => {
            client.send(
              JSON.stringify(
                sessionRecords[sessionRecords.length - 1].state
              )
            );
          })
          .catch((err) => {
            console.log("Error in finding session for undo", err);
          });
      }
    }
    
    /*  REDO: **feature not yet functional**
        This is for 'redoing' an undo.
        If the stateChange action is 'redo', the recently deleted or undone state will be reverted. This reverted state will then
        be sent to all clients and their current state will also be the reverted state.
    */
    if (stateChange.action === "redo") {
    }


  }
  addSocket(socket) {
    this.clients.push(socket);
  }
  clearState (){
    db.collection.drop();
  }
  __getDB(){
    return db;
  }
}

//



