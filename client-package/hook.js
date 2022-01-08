/**
 * @file This file contains the connection class and the useSyncState function.
 * To use these features a user should import socket-league-client. See README.md for more info.
 */

const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

/**
 * The connection class handles the websocket connection
 */
export class Connection {
  constructor(url) {
    this.socket = new WebSocket(url);

    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendUpdate = this.sendUpdate.bind(this);
    this.sendUndo = this.sendUndo.bind(this);
    this._publish = this._publish.bind(this);

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

    this.socket.onopen = () => {
      for (const data of this.pendingMessageData) {
        this.socket.send(data);
      }
      this.pendingMessageData = [];
    };
  }

  /**
   * @property {Function} subscribe
   * @param {*} session This is the session id that clients subscribe to
   * @param {*} onMessage placeholder text description
   * @param {*} initialState This is the initial state that the client is given when they subscribe to a session
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
    this._publish({ action, state, session });
  }

  /**
   * @property {Function} unsubscribe
   * @param {*} session This is the session id that clients subscribe to
   */
  unsubscribe(session) {
    if (!this.subscriptions.has(session)) {
      console.log(
        `[SL] Warning: no subscription exists for session ${session}. Doing nothing.`
      );
      return;
    }
    this.subscriptions.delete(session);
  }

  /**
   * @property {Function} sendUndo
   * @param {*} session This is the session id that clients are subscribed to
   */
  sendUndo(session) {
    const action = types.UNDO;
    this._publish({ action, session });
  }

  /**
   * @property {Function} sendUpdate
   * @param {*} session This is the session id
   * @param {*} newState This is the new state that the client passes in
   */
  sendUpdate(session, newState) {
    const action = types.UPDATE;
    const state = newState;
    this._publish({ action, state, session });
  }

  /**
   * @property {Function} _publish
   * @param {Object} message This is an object sent by the client that is being stringified and sent through the web socket
   */
  _publish(message) {
    const data = JSON.stringify(message);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    } else {
      this.pendingMessageData.push(data);
    }
  }
}

/**
 * Custom React hook that will be called on the client
 * @param {*} session This is the session id that the client is subscribed to
 * @param {*} initialState This is the initialState that the hook initializes
 * @param {*} conn This is the connection to the web socket
 * @param {*} react This is to specify which react to use
 * @returns The state, the setsyncstate function and the undo function
 */
export const useSyncState = (session, initialState, conn, react) => {
  const [state, setState] = react.useState(initialState);
  const handleMessage = (message) => {
    setState(message);
  };

  react.useEffect(() => {
    conn.subscribe(session, handleMessage, initialState);
    return () => conn.unsubscribe(session);
  }, [session]);

  const setSyncState = (newState) => {
    setState(newState);
    conn.sendUpdate(session, newState);
  };

  const undo = () => {
    conn.sendUndo(session);
  };

  return [state, setSyncState, undo];
};
