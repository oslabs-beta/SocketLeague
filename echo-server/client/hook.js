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
    this.publish = this.publish.bind(this);
  }
  subscribe(onMessage) {
    // TODO: unpack state based on the message protocol we come up with
    this.socket.on("message", onMessage);
  }  
  unsubscribe() {
    // TODO: remove event handler
  }
  publish(message) {
    // TODO: pack state based on the message protocol we come up with
    this.socket.send(JSON.stringify(message));
  }
};

export const useSyncState = (initialState, conn) => {
  const [state, setState] = useState(initialState);
  const handleMessage = message => {
    // TODO: unpack state based on the message protocol we come up with
    setState(message);
  };

  useEffect(() => {
    conn.subscribe(handleMessage);
    return conn.unsubscribe;
  }, []);

  const setSyncState = newState => {
    setState(newState);
    const action = types.UPDATE;
    const state = newState;
    const session = 0;
    conn.publish({ action, state, session });
  };
  return [state, setSyncState];
};
