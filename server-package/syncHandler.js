/**
 * @file synchandler.js contains the SyncHandler Class that is being exported into the index.js file
 */

//temporary: directly database into the websocket server
// const db = require('./models/clientModel.js');
const StateMerger = require('./merger');
// import db from "./models/clientModel.js";
// const mongoose = require('mongoose');

//eventually we need to export stuff

//do all the database calls in here
//store the state in here

//refactor by making it its own file
/**
 * Object containing all the action types that we can expect in the message received by the client
 * @type {object}
 */
const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

autoDisconnectClients = true;

/**
 * @class SyncHandler
 */
class SyncHandler {

  /**
   * @param db
   */
  constructor(db) {
    this.sessions = {};
    this.db = db;
    this.merger = new StateMerger();
    this.handleWsConnection = (socket) => {
      console.log('Somebody connected to the websocket server');
      socket.on('message', (message) => {
        this.handleState(message, socket);
      });
    };
  }



  /**
   * @property {Function} connect Connect to the users provided URI
   *
   */
  async connect() {
    await this.db.connect();
  }

  toggleAutoDisconnect(){
    autoDisconnectClients = !autoDisconnectClients;
    return autoDisconnectClients;
  }

    /**
   * @property {Function} processState helper function to validate state changes. Overwrite this method to change the behavior of handleState
   * @param {*} stateChange This is a JSON stringify object containing the JSON parsed message
   * 
   */
 processState(stateChange){
    return stateChange;
  }



  /**
   * @property {Function} handleState Primary function that handles all state changes includeing the initial state and any update/undo state changes
   * @param {*} message This is a JSON stringify object containing action, state, and session
   * @param {*} socket This is the web socket the function is connected to
   */
  async handleState(message, socket) {
    function createNewSession(sessions, stateChange) {
      console.log('initializing session ' + stateChange.session);
      if (sessions[stateChange.session]) {
      } else {
        sessions[stateChange.session] = new Set();
      }
      socket._slname = "session: "+stateChange.session+" ID: "+sessions[stateChange.session].size;
      sessions[stateChange.session].add(socket);
    }
    function sendStateUpdate(record, client, sessions) {
      const OPEN = 1; //readyState 1 = WebSocket.OPEN
      // console.log(client._slname, client._readyState, client._closeCode, client._closeFrameReceived, client._closeFrameSent);
      if (!autoDisconnectClients || client.readyState === OPEN){ 
        client.send(
          JSON.stringify({ state: record.state, session: record.session })
        );
      } else if (client.readyState > OPEN) {
        sessions[record.session].delete(client);
      }
      // pingClient(socket);
    }
    //parse the message into a json object
    const stateChange = this.processState(JSON.parse(message)); //message.json(); //stateChange will be an object now
    // const stateChange = JSON.parse(message); //message.json(); //stateChange will be an object now
    /*  INITIAL:
            This is for initial connection to an existing session or to a new session.
            If the stateChange action is 'initial', first check for an existing session ID associated with the message. 
            If it exists, the server connects the client to the existing state.
            If the session ID does not exist, a new one is created and a new database entry is also created.
            Only clients with the right session ID receive updates
      */
    if (stateChange.action === 'initial') {
      console.log(`Got an initial message: ${message}`);
      try {
        this.db.getLatestSessionRecord(stateChange.session).then((data) => {
          if (data) {
            createNewSession(this.sessions, stateChange);
            for (const client of this.sessions[stateChange.session]) {
              sendStateUpdate(data, client, this.sessions);
            }
          } else {
            this.db
              .createSessionRecord(stateChange.session, stateChange.state)
              .then((data) => {
                createNewSession(this.sessions, stateChange);
                for (const client of this.sessions[stateChange.session]) {
                  sendStateUpdate(data, client, this.sessions);
                }
              })
              .catch((err) => {
                console.log('Error in create initial', err);
              });
          }
        });
      } catch (err) {
        console.log('Error in initial', err);
      }
      // db.find({ session: stateChange.session }).then((data) => {
      //   if (data.length > 0) {
      //     createNewSession(this.sessions,stateChange);
      //     for (const client of this.sessions[stateChange.session]) {
      //       sendStateUpdate(data[data.length - 1], client);
      //     }
      //   } else {
      //     db.create({ session: stateChange.session, state: stateChange.state })
      //       .then((data) => {
      //         createNewSession(this.sessions,stateChange);
      //         for (const client of this.sessions[stateChange.session]) {
      //           sendStateUpdate(data, client);
      //         }
      //       })
      //       .catch((err) => {
      //         console.log('Error in create initial', err);
      //       });
      //   }
      // });
    }

    /*  UPDATE:
          This is for updating the state between clients. 
          If there is an 'update' action, Create new state in the database.
          Find all the clients that are sharing the same session ID, and update their current to the new state. 
      */
    if (stateChange.action === 'update') {
      // console.log(`Got an update message:`);
      console.log(`Got an update message: ${message}`);
      try {
        const { oldState, state, session } = stateChange;
        const serverState = (await this.db.getLatestSessionRecord(session))
          .state;
        const mergedState = this.merger.merge(
          session,
          serverState,
          oldState,
          state
        );
        const record = await this.db.createSessionRecord(session, mergedState);
        for (const client of this.sessions[session]) {
          sendStateUpdate(record, client, this.sessions);
        }
      } catch (err) {
        console.log('Error in update', err);
      }
      //add new messages to the list of all messages
      //we need this to create a new entry
      //db.create({ session: stateChange.session, state: mergedState })
      //  .then((data) => {
      //    //redundant because we have the record we just added but search the database for the latest record anyway
      //    //logic for sending updated state to clients needs refactoring
      //    for (const client of this.sessions[stateChange.session]) {
      //      db.find({ session: stateChange.session })
      //        .then((sessionRecords) => {
      //          sendStateUpdate(
      //            sessionRecords[sessionRecords.length - 1],
      //            client
      //          );
      //        })
      //        .catch((err) => {
      //          console.log('Error in finding session', err);
      //        });
      //    }
      //  })
      //  .catch((err) => {
      //    console.log('Error in update', err);
      //  });
    }

    /*  UNDO:
            This is for 'undoing' an action or reverting to a previous state.
            If the stateChange action is 'undo', we apply method findOneAndDelete. This will search for the latest state stored in the
            database and delete it. The last record before the one deleted will be sent out to all clients and become the current state.
      */
    if (stateChange.action === 'undo') {
      console.log(`Got an undo message: ${message}`);
      try {
        await this.db.deleteLatestSessionRecord(stateChange.session);
        const record = await this.db.getLatestSessionRecord(
          stateChange.session
        );
        for (const client of this.sessions[stateChange.session]) {
          sendStateUpdate(record, client, this.sessions);
        }
      } catch (err) {
        console.log('Error in undo', err);
      }

      // db.find({ session: stateChange.session })
      //   .then((data) => {
      //     if (data.length > 1) {
      //       // console.log(data[data.length - 1]._id, " will be deleted.");
      //       db.findOneAndDelete({ _id: data[data.length - 1]._id }).then(
      //         (data) => {
      //           console.log(data._id, 'was deleted');
      //          for (const client of this.sessions[stateChange.session]) {
      //            //TODO: error handle for if the array is empty later
      //            db.find({ session: stateChange.session })
      //              .then((sessionRecords) => {
      //                sendStateUpdate(
      //                  sessionRecords[sessionRecords.length - 1],
      //                  client
      //                );
      //              })
      //              .catch((err) => {
      //                console.log('Error in finding session for undo', err);
      //              });
      //          }
      //        }
      //      );
      //    }
      //  })
      //  .catch((err) => {
      //    console.log('Error in undo', err);
      //  });
    }

    /*  REDO: **feature not yet functional**
          This is for 'redoing' an undo.
          If the stateChange action is 'redo', the recently deleted or undone state will be reverted. This reverted state will then
          be sent to all clients and their current state will also be the reverted state.
      */
    if (stateChange.action === 'redo') {
    }

    if (stateChange.action === 'unsubscribe') {
      console.log(`Got an unsubscribe message: ${message}`);
      try {
        //this.sessions is an object, and each property has a key of a Set of clients
        this.sessions[stateChange.session].delete(socket);
      } catch (err) {
        console.log('Error in unsubscribe', err);
      }
    }
  }

  /**
   * @property {function} __getDB getDB is a method to return the entire DB ()
   */
  __getDB() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}


module.exports = SyncHandler;
