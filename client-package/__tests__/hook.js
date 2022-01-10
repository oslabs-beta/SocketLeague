import { useSyncState, Connection } from '../hook';
import { WS } from 'jest-websocket-mock';
import jest from 'jest-mock';

const WS_URI = 'ws://localhost:3000';

class MessageListener {
  constructor() {
    this.handler = this.handler.bind(this);
    this._pendingResolvers = [];
    this._readyMessages = [];
  }

  get nextMessage() {
    if (this._readyMessages.length) {
      return this._readyMessages.shift();
    }
    else {
      let resolver;
      const messagePromise = new Promise(
        (resolve, reject) => (resolver = resolve)
      );
      this._pendingResolvers.push(resolver);
      return messagePromise;
    }
  }

  handler(message) {
    if (this._pendingResolvers.length) {
      this._pendingResolvers.shift(message);
    }
    else {
      this._readyMessages.push(
        new Promise((resolve, reject) => {
          resolve(message);
        })
      );
    }
  }
}

describe('Connection', () => {
  let server;
  let conn;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
  });

  afterEach(() => {
    conn.close();
    WS.clean();
  });

  it('Connects to the server', async () => {
    conn = new Connection(WS_URI);
    await server.connected;
  });

  it('Sends an update to the server', async () => {
    conn = new Connection(WS_URI);
    await server.connected;
    conn.sendUpdate('0', 'old', 'hello');
    await expect(server).toReceiveMessage({
      action: 'update',
      oldState: 'old',
      state: 'hello',
      session: '0',
    });
  });

  it('Subscribes to the server', async () => {
    conn = new Connection(WS_URI);
    await server.connected;
    conn.subscribe('0', () => {}, 'hello');
    await expect(server).toReceiveMessage({
      action: 'initial',
      state: 'hello',
      session: '0',
    });
  });

  it('Gets updates from the server', async () => {
    conn = new Connection(WS_URI);
    await server.connected;
    let handlerResolve;
    const handler = new Promise(resolve => { handlerResolve = resolve });
    conn.subscribe('0', message => handlerResolve(message), 'hello');
    await server.send({
      state: 'hello',
      session: '0',
    });
    const message = await handler;
    expect(message).toEqual('hello');
  });

  it('Sends an undo message', async() => {
    conn = new Connection(WS_URI);
    await server.connected;
    conn.sendUndo('0');
    await expect(server).toReceiveMessage({
      action: 'undo',
      session: '0',
    });
  });

  it('Routes updates from server to the correct session', async () => {
    conn = new Connection(WS_URI);
    await server.connected;

    const listenerOdd = new MessageListener();
    conn.subscribe('odd_numbers', listenerOdd.handler);
    const listenerEven = new MessageListener();
    conn.subscribe('even_numbers', listenerEven.handler);

    server.send({
      session: 'odd_numbers',
      state: 1,
    });
    server.send({
      session: 'even_numbers',
      state: 2,
    });
    server.send({
      session: 'odd_numbers',
      state: 3,
    });
    server.send({
      session: 'even_numbers',
      state: 4,
    });
    server.send({
      session: 'odd_numbers',
      state: 5,
    });
    server.send({
      session: 'even_numbers',
      state: 6,
    });

    expect(await listenerOdd.nextMessage).toEqual(1);
    expect(await listenerOdd.nextMessage).toEqual(3);
    expect(await listenerOdd.nextMessage).toEqual(5);
    expect(await listenerEven.nextMessage).toEqual(2);
    expect(await listenerEven.nextMessage).toEqual(4);
    expect(await listenerEven.nextMessage).toEqual(6);
  });

});

describe('useSyncState', () => {
  let server;
  let conn;
  let react;

  const mockReact = () => {
    const setState = jest.fn();
    return {
      useState: (newState) => [newState, setState],
      useEffect: (effect) => { effect(); },
      setState,
    };
  };

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
    conn = new Connection(WS_URI);
    react = mockReact();
  });

  afterEach(() => {
    conn.close(); //if you don't close the client first, you leave open handles that linger after the test suites complete
    WS.clean();
  });

  it('Sends initial state to the server', async () => {
    useSyncState('0', 'hello', conn, react);
    await expect(server).toReceiveMessage({
      action: 'initial',
      state: 'hello',
      session: '0',
    });
  })

  it('Sends updated state to the server', async () => {
    const [state, setState] = useSyncState('0', 'hello', conn, react);
    // Skipping initial message
    await server.nextMessage;
    setState('bye');
    await expect(server).toReceiveMessage({
      action: 'update',
      state: 'bye',
      oldState: 'hello',
      session: '0',
    });
  })

  it('Invokes setState upon update from server', async () => {
    useSyncState('0', 'hello', conn, react);
    await server.connected;
    server.send({
      state: 'bye',
      session: '0',
    });
    expect(react.setState).toBeCalledWith('bye');
  });

  it('Sends an undo message', async () => {
    const [state, setState, undo] = useSyncState('0', 'hello', conn, react);
    // Skipping initial message
    await server.nextMessage;
    undo();
    await expect(server).toReceiveMessage({
      action: 'undo',
      session: '0',
    });
  });

  it('Updates the correct state when there are multiple sessions', async () => {
    useSyncState('0', 'junk', conn, react);
    const react2 = mockReact();
    useSyncState('1', 'junk', conn, react2);
    await server.connected;
    server.send({
      state: 'val0',
      session: '0',
    });
    server.send({
      state: 'val1',
      session: '1',
    });
    expect(react.setState).toBeCalledWith('val0');
    expect(react2.setState).toBeCalledWith('val1');
  });
});
