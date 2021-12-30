import { useSyncState, Connection } from '../hook';
import { WS } from 'jest-websocket-mock';

const WS_URI = "ws://localhost:3000";

describe("Connection", () => {
  let server;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
  });

  afterEach(() => {
    WS.clean();
  });

  it("Connects to the server", async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
  });

  it("Sends an update to the server", async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    conn.sendUpdate('hello');
    await expect(server).toReceiveMessage({
      action: 'update',
      state: 'hello',
      session: '0',
    });
  });

  // currently broken
  xit("Subscribes to the server", async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    conn.subscribe(() => {}, 'hello');
    await expect(server).toReceiveMessage({
      action: 'initial',
      state: 'hello',
      session: '0',
    });
  });

  it("Gets updates from the server", async () => {
    const conn = new Connection(WS_URI);
    await server.connected;
    let handlerResolve;
    const handler = new Promise(resolve => { handlerResolve = resolve });
    conn.subscribe(message => handlerResolve(JSON.parse(message.data)), 'hello');
    await server.send("hello");
    return handler.then(message => expect(message).toEqual('hello'));
  });
});

describe('useSyncState', () => {
  let server;
  let conn;
  let react;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
    conn = new Connection(WS_URI);
    react = {
      useState: (newState) => [newState, () => {}],
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
    setState('bye');
    await expect(server).toReceiveMessage({
      action: 'update',
      state: 'bye',
      session: '0',
    });
  })
});
