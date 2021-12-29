import { useState, useEffect } from 'react';

const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

class Connection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendUpdate = this.sendUpdate.bind(this);
    this._publish = this._publish.bind(this);

    this.subscriptions = new Map();
    this.socket.on("message", message => {
      const session = '0';
      const callback = this.subscriptions.get(session);
      if (!callback) {
        console.log(`[SL] Warning: no handler registered for session ${session}. Ignoring message.`);
        return;
      }
      callback(message);
    });
  }
  
  subscribe(onMessage, initialState) {
    const session = '0';
    if (this.subscriptions.has(session)) {
      console.log(`[SL] Warning: a subscription already exists for session ${session}. Overriding the old message handler.`);
    }
    this.subscriptions.set(session, onMessage);
    const action = types.INITIAL;
    const state = initialState;
    this._publish({ action, state, session });
  }  

  unsubscribe() {
    if (!this.subscriptions.has(session)) {
      console.log(`[SL] Warning: no subscription exists for session ${session}. Doing nothing.`);
      return;
    }
    this.subscriptions.delete(session);
  }

  sendUpdate(newState) {
    const action = types.UPDATE;
    const state = newState;
    const session = '0';
    conn._publish({ action, state, session });
  }

  _publish(message) {
    this.socket.send(JSON.stringify(message));
  }
};

export const useSyncState = (initialState, conn) => {
  const [state, setState] = useState(initialState);
  const handleMessage = message => {
    setState(JSON.parse(message));
  };

  useEffect(() => {
    conn.subscribe(handleMessage, initialState);
    return conn.unsubscribe;
  }, []);

  const setSyncState = newState => {
    setState(newState);
    conn.sendUpdate(newState);
  };
  return [state, setSyncState];
};
