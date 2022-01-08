const types = {
  UPDATE: 'update',
  INITIAL: 'initial',
  UNDO: 'undo',
  REDO: 'redo',
};

/**
 * Place holder text for connection class
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
   * @param {*} session placeholder text description
   * @param {*} onMessage placeholder text description
   * @param {*} initialState placeholder text description
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
   * @param {*} session placeholder text description
   * @returns placeholder text description
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
   * @param {*} session placeholder text description
   */
  sendUndo(session) {
    const action = types.UNDO;
    this._publish({ action, session });
  }

  sendUpdate(session, newState) {
    const action = types.UPDATE;
    const state = newState;
    this._publish({ action, state, session });
  }

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
 * placeholder text description
 * @param {*} session placeholder text description
 * @param {*} initialState placeholder text description
 * @param {*} conn placeholder text description
 * @param {*} react placeholder text description
 * @returns placeholder text description
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
