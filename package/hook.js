import React, { useState, useEffect } from 'react';

const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

export const HookReact = React;

export class Connection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.sendUpdate = this.sendUpdate.bind(this);
    this._publish = this._publish.bind(this);

    this.subscriptions = new Map();
    this.socket.addEventListener("message", message => {
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
    this.socket.onopen=()=>{
      console.log('hit onopen event listener')
      this._publish({ action, state, session });
    }
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
    this._publish({ action, state, session });
  }

  _publish(message) {
    console.log('hit publish hook')
    this.socket.send(JSON.stringify(message));
  }
};

export const useSyncState = (initialState, conn) => {
  const [state, setState] = useState(initialState);
  const handleMessage = message => {
    setState(JSON.parse(message.data));
    /*
    const reader = new FileReader();

    //reader.onload is invoked as a result of readAsText
    reader.onload = () => {
      //convert reader.result from a string to an object
      console.log(`raw result: ${reader.result}`);
      const readState = JSON.parse(reader.result);
      //we need to set this object as the state for the client
      console.log(`parsed result: ${readState}`);
      setState(readState);
    };

    console.log("Mesage type: ", message);
    reader.readAsText(message.data);
    */
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
