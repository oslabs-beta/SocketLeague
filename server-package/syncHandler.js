/**
 * @file synchandler.js contains the SyncHandler Class that is being exported into the index.js file
 */

const StateMerger = require("./merger");
const JsonDriver = require("./jsonDriver");

/**
 * Object containing all the action types that we can expect in the message received by the client
 * @type {object}
 */
const types = {
  UPDATE: "update",
  INITIAL: "initial",
  UNDO: "undo",
  REDO: "redo",
};

autoDisconnectClients = true; //need to refactor this out

/**
 * @class SyncHandler
 */
class SyncHandler {
  /**
   * @param db
   */
  constructor(db) {
    this.sessions = {};
    this.db = db || new JsonDriver();
    this.merger = new StateMerger();
    this.handleWsConnection = (socket) => {
      socket.on("message", (message) => {
        this.handleState(message, socket);
      });
    };
    // this.autoDisconnectClients = true;
  }

  /**
   * @property {Function} connect Connect to the users provided URI
   *
   */
  async connect() {
    await this.db.connect();
  }

  toggleAutoDisconnect() {
    autoDisconnectClients = !autoDisconnectClients;
    return autoDisconnectClients;
  }

  /**
   * @property {Function} processState helper function to validate state changes. Overwrite this method to change the behavior of handleState
   * @param {*} stateChange This is a JSON stringify object containing the JSON parsed message
   *
   */
  processState(stateChange) {
    return stateChange;
  }

  setProcessState(func){
    this.processState = func;
  }

  resetProcessState() {
    this.processState = (stateChange) => {
      return stateChange;
    };
  }

  /**
   * @property {Function} handleState Primary function that handles all state changes includeing the initial state and any update/undo state changes
   * @param {*} message This is a JSON stringify object containing action, state, and session
   * @param {*} socket This is the web socket the function is connected to
   */
  async handleState(message, socket) {
    function createNewSession(sessions, stateChange) {
      if (sessions[stateChange.session]) {
      } else {
        sessions[stateChange.session] = new Set();
      }
      socket._slname =
        "session: " +
        stateChange.session +
        " ID: " +
        sessions[stateChange.session].size;
      sessions[stateChange.session].add(socket);
    }
    function sendStateUpdate(record, client, sessions) {
      const OPEN = 1; //readyState 1 = WebSocket.OPEN
      if (!autoDisconnectClients || client.readyState === OPEN) {
        client.send(
          JSON.stringify({ state: record.state, session: record.session })
        );
      } else if (client.readyState > OPEN) {
        sessions[record.session].delete(client);
      }
    }
    //parse the message into a json object
    const stateChange = this.processState(JSON.parse(message));
    /*  INITIAL:
            This is for initial connection to an existing session or to a new session.
            If the stateChange action is 'initial', first check for an existing session ID associated with the message. 
            If it exists, the server connects the client to the existing state.
            If the session ID does not exist, a new one is created and a new database entry is also created.
            Only clients with the right session ID receive updates
      */
    if (stateChange.action === "initial") {
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
                console.log("Error in create initial", err);
              });
          }
        });
      } catch (err) {
        console.log("Error in initial", err);
      }
    }

    /*  UPDATE:
          This is for updating the state between clients. 
          If there is an 'update' action, Create new state in the database.
          Find all the clients that are sharing the same session ID, and update their current to the new state. 
      */
    if (stateChange.action === "update") {
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
        console.log("Error in update", err);
      }
    }

    /*  UNDO:
            This is for 'undoing' an action or reverting to a previous state.
            If the stateChange action is 'undo', we apply method findOneAndDelete. This will search for the latest state stored in the
            database and delete it. The last record before the one deleted will be sent out to all clients and become the current state.
      */
    if (stateChange.action === "undo") {
      try {
        await this.db.deleteLatestSessionRecord(stateChange.session);
        const record = await this.db.getLatestSessionRecord(
          stateChange.session
        );
        for (const client of this.sessions[stateChange.session]) {
          sendStateUpdate(record, client, this.sessions);
        }
      } catch (err) {
        console.log("Error in undo", err);
      }
    }

    if (stateChange.action === "unsubscribe") {
      try {
        //this.sessions is an object, and each property has a key of a Set of clients
        this.sessions[stateChange.session].delete(socket);
      } catch (err) {
        console.log("Error in unsubscribe", err);
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
