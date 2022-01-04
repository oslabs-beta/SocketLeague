import { useSyncState, Connection } from '../hook';
import { WS } from 'jest-websocket-mock';
import jest from 'jest-mock';

const WS_URI = 'ws://localhost:3000';

describe('Connection', () => {
  let server;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
  });

  afterEach(() => {
    WS.clean();
  });

  it('Connects to the server', async () => {
    new Connection(WS_URI);
    await server.connected;
  });

  it('Sends an update to the server', async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    conn.sendUpdate('hello');
    await expect(server).toReceiveMessage({
      action: 'update',
      state: 'hello',
      session: '0',
    });
  });

  it('Subscribes to the server', async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    conn.subscribe(() => {}, 'hello');
    await expect(server).toReceiveMessage({
      action: 'initial',
      state: 'hello',
      session: '0',
    });
  });

  it('Gets updates from the server', async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    let handlerResolve;
    const handler = new Promise(resolve => { handlerResolve = resolve });
    conn.subscribe(message => handlerResolve(message), 'hello');
    await server.send('hello');
    return handler.then(message => expect(message).toEqual('hello'));
  });

  it('Sends an undo message', async() => {
    const conn = new Connection(WS_URI);
    await server.connected;
    conn.sendUndo();
    await expect(server).toReceiveMessage({
      action: 'undo',
      session: '0',
    });
  });
});

describe('useSyncState', () => {
  let server;
  let conn;
  let react;
  let setLocalState;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
    conn = new Connection(WS_URI);
    setLocalState = jest.fn();
    react = {
      useState: (newState) => [newState, setLocalState],
      useEffect: (effect, deps) => { effect(); },
    };
  });

  afterEach(() => {
    WS.clean();
  });

  it('Sends initial state to the server', async () => {
    const [state, setState] = useSyncState('hello', conn, react);
    await expect(server).toReceiveMessage({
      action: 'initial',
      state: 'hello',
      session: '0',
    });
  })

  it('Sends updated state to the server', async () => {
    const [state, setState] = useSyncState('hello', conn, react);
    // Skipping initial message
    await server.nextMessage;
    setState('bye');
    await expect(server).toReceiveMessage({
      action: 'update',
      state: 'bye',
      session: '0',
    });
  })

  it('Invokes setState upon update from server', async () => {
    const [state, setState] = useSyncState('hello', conn, react);
    await server.connected;
    server.send('bye');
    expect(setLocalState).toBeCalledWith('bye');
  });

  it('Sends an undo message', async () => {
    const [state, setState, undo] = useSyncState('hello', conn, react);
    // Skipping initial message
    await server.nextMessage;
    undo();
    await expect(server).toReceiveMessage({
      action: 'undo',
      session: '0',
    });
  });
});
