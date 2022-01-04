const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

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
    this.socket.addEventListener("message", message => {
      const session = '0';
      const callback = this.subscriptions.get(session);
      if (!callback) {
        console.log(`[SL] Warning: no handler registered for session ${session}. Ignoring message.`);
        return;
      }
      const parsedMessage = JSON.parse(message.data);
      callback(parsedMessage);
    });

    this.socket.onopen = () => {
      for (const data of this.pendingMessageData) {
        this.socket.send(data);
      }
      this.pendingMessageData = [];
    };
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

  sendUndo() {
    const action = types.UNDO;
    const session = '0';
    this._publish({ action, session });
  }

  sendUpdate(newState) {
    const action = types.UPDATE;
    const state = newState;
    const session = '0';
    this._publish({ action, state, session });
  }

  _publish(message) {
    const data = JSON.stringify(message);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
    else {
      this.pendingMessageData.push(data);
    }
  }
};


export const useSyncState = (initialState, conn, react) => {
  const [state, setState] = react.useState(initialState);
  const handleMessage = message => {
    setState(message);
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

  react.useEffect(() => {
    conn.subscribe(handleMessage, initialState);
    return conn.unsubscribe;
  }, []);

  const setSyncState = newState => {
    setState(newState);
    conn.sendUpdate(newState);
  };

  const undo = () => {
    conn.sendUndo();
  };

  return [state, setSyncState, undo];
};
