import React from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

/**
 * @file This file contains the connection class and the useSyncState function.
 * To use these features a user should import socket-league-client. See README.md for more info.
 */

const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNSUBSCRIBE: 'unsubscribe',
  UNDO: 'undo',
};

/**
 * The connection class handles the websocket connection
 */
export class Connection {
  constructor(url) {
    this.socket = new ReconnectingWebSocket(url);

    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendUpdate = this.sendUpdate.bind(this);
    this.sendUndo = this.sendUndo.bind(this);
    this._send = this._send.bind(this);
    this._canResubscribe = false;

    this.pendingMessageData = [];

    this.subscriptions = new Map();
    this.socket.addEventListener('message', (message) => {
      const parsedMessage = JSON.parse(message.data);
      const { session, state } = parsedMessage;
      const callback = this.subscriptions.get(session);
      if (!callback) {
        console.log(
          `[SL] Warning: no handler registered for session ${session}. Ignoring message.`
        );
        return;
      }
      callback(state);
    });

    /**
     * This is called on initial connection to the server and on reconnecting using ReconnectingWebSocket
     */
    this.socket.onopen = () => {
      if (this._canResubscribe) this.resubscribe();
      for (const data of this.pendingMessageData) {
        this.socket.send(data);
      }
      this.pendingMessageData = [];
    };
    this.socket.onclose = () => {
      this._canResubscribe = true;
    };
  }

  /**
   * Subscribe a client to state changes
   * @param {String} session The session that the client is subscribing to
   * @param {function} onMessage A callback that will be invoked when a message arrives for the session
   * @param {Object} initialState The default initial state; only used when creating a new session
   */
  subscribe(session, onMessage, initialState) {
    if (this.subscriptions.has(session)) {
      console.log(
        `[SL] Warning: a subscription already exists for session ${session}. Overriding the old message handler.`
      );
    }
    this.subscriptions.set(session, onMessage);
    const action = types.INITIAL;
    const state = initialState;
    this._send({ action, state, session });
  }

  /**
   * Unsubscribe a client to a state
   * @param {String} session The session that the client is unsubscribing from
   */
  unsubscribe(session) {
    if (!this.subscriptions.has(session)) {
      console.log(
        `[SL] Warning: no subscription exists for session ${session}. Doing nothing.`
      );
      return;
    }
    this.subscriptions.delete(session);
    const action = types.UNSUBSCRIBE;
    this._send({ action, session });
  }

  /**
   * This method is called to try to reestablish any stored sessions in the client upon connection to the server
   */
  resubscribe() {
    if (this.subscriptions.size > 0) {
      this.subscriptions.forEach((hook, session) => {
        const action = types.INITIAL;
        const state = '';
        this._send({ action, state, session });
      });
    }
  }

  /**
   * Requests the server undo the latest state change
   * @param {String} session The session from which the client will undo a state change
   */
  sendUndo(session) {
    const action = types.UNDO;
    this._send({ action, session });
  }

  /**
   * Sends the updated state to the server
   * @param {String} session This is the session id
   * @param {Object} oldState This is the previous state from before the update
   * @param {Object} newState This is the new state that the client passes in
   */
  sendUpdate(session, oldState, newState) {
    const action = types.UPDATE;
    const state = newState;
    this._send({ action, state, oldState, session });
  }

  /**
   * Used internally to send a message to the server
   * @param {Object} message This is an object sent by the client that is being stringified and sent through the web socket
   */
  _send(message) {
    const data = JSON.stringify(message);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    } else {
      this.pendingMessageData.push(data);
    }
  }
  /**
   * Close the ReconnectingWebSocket
   */
  close() {
    this.socket.close();
  }
}

/**
 * Custom React hook that will be called on the client
 * @param {String} session This is the session id that the hook is subscribed to
 * @param {Object} initialState This is the initialState that the hook initializes
 * @param {Connection} conn This is the connection to the web socket
 * @param {React} react This is to optionally specify which react to use
 * @returns The state, the state setter function and the state undo function
 */
export function useSyncState(session, initialState, conn, react = React) {
  const [state, setState] = react.useState(initialState);
  /**
   * HadleMessage will set the state to message provided by the client
   * @param {Object} message Updated state sent by the client
   */
  const handleMessage = (message) => {
    setState(message);
  };

  react.useEffect(() => {
    conn.subscribe(session, handleMessage, initialState);
    return () => conn.unsubscribe(session);
  }, [session]);

  /**
   * Sends state updates to the server
   * @param {Object} newState new updated state provided by the client
   */
  const setSyncState = (newState) => {
    const oldState = state;
    setState(newState);
    conn.sendUpdate(session, oldState, newState);
  };

  /**
   * Sends an undo action to the server
   */
  const undo = () => {
    conn.sendUndo(session);
  };

  return [state, setSyncState, undo];
}
