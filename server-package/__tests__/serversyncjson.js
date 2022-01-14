const dotenv = require('dotenv');

dotenv.config();

const { Server } = require('mock-socket');

const SyncHandler = require('../syncHandler.js');
const MockClient = require('../mockClient');

const PORT = 3000;
const WS_URI = `ws://localhost:${PORT}`;

describe('WebSocket Server', () => {
  let syncState;
  const wsServer = new Server(WS_URI);

  beforeAll(async () => {
    syncState = new SyncHandler();
    await syncState.connect();
    wsServer.on('connection', syncState.handleWsConnection);
  });

  afterAll(async () => {
    await syncState.close();
  });

  it('Client receives initial state when joining a new session', async () => {
    await syncState.db.clearAllStates();
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'this is a test message',
      action: 'initial',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({
      session: '0',
      state: 'this is a test message',
    });
  });

  it('Server sends an existing state to the client when the client connects with a valid session ID', async () => {
    await syncState.db.clearAllStates();
    const client1 = new MockClient(WS_URI);
    await client1.connected;

    client1.send({
      state: 'initial state',
      action: 'initial',
      session: '0',
    });
    await client1.nextMessage;

    const client2 = new MockClient(WS_URI);
    await client2.connected;
    client2.send({
      state: 'different initial state',
      action: 'initial',
      session: '0',
    });

    await expect(client2).toReceiveClientMessage({
      session: '0',
      state: 'initial state',
    });
  });

  it('Server broadcasts updated state to all clients with same session ID when it receives an updated state', async () => {
    await syncState.db.clearAllStates();
    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    client1.send({
      state: 'initialize client 1',
      action: 'initial',
      session: '0',
    });
    await client1.nextMessage;

    client2.send({
      state: 'initialize client 2',
      action: 'initial',
      session: '0',
    });
    await client2.nextMessage;

    client1.send({
      state: 'new message',
      action: 'update',
      session: '0',
    });
    await expect(client2).toReceiveClientMessage({
      session: '0',
      state: 'new message',
    });
  });

  it('Server broadcasts updated state to only appropriate clients when it receives an updated state', async () => {
    await syncState.db.clearAllStates();
    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    client1.send({
      state: 'initialize client 1',
      action: 'initial',
      session: '4',
    });
    await expect(client1).toReceiveClientMessage({
      session: '4',
      state: 'initialize client 1',
    });

    client2.send({
      state: 'initialize client 2',
      action: 'initial',
      session: '3',
    });
    await expect(client2).toReceiveClientMessage({
      session: '3',
      state: 'initialize client 2',
    });

    client1.send({
      state: 'session four update',
      action: 'update',
      session: '4',
    });
    client2.send({
      state: 'session three update',
      action: 'update',
      session: '3',
    });
    await expect(client1).toReceiveClientMessage({
      session: '4',
      state: 'session four update',
    });
    await expect(client2).toReceiveClientMessage({
      session: '3',
      state: 'session three update',
    });
  });

  it('Server reverts to the previous state stored in the database for a given session (upon receiving the undo call).', async () => {
    await syncState.db.clearAllStates();
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'initial state',
      action: 'initial',
      session: '0',
    });
    await client.nextMessage;
    client.send({
      state: 'update1',
      action: 'update',
      session: '0',
    });
    await client.nextMessage;
    client.send({
      state: 'update2',
      action: 'update',
      session: '0',
    });
    await client.nextMessage;

    client.send({
      action: 'undo',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({
      session: '0',
      state: 'update1',
    });

    client.send({
      action: 'undo',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({
      session: '0',
      state: 'initial state',
    });
  });

  it('Server reverts to correct state after three updates, two undos, two updates, and two undos.', async () => {
    await syncState.db.clearAllStates();
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'initialize undo stress test',
      action: 'initial',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({
      session: '0',
      state: 'initialize undo stress test',
    });

    // first update [history: 1]
    client.send({
      state: 'first update',
      action: 'update',
      session: '0',
    });
    await client.nextMessage;

    // The undo used to fail unpredictably, so we are repeating the
    // following messages multiple times to increase the likelihood
    // that the test fails if there is an issue
    for (let i = 0; i < 3; i++) {
      // second update [history: 1 > 2]
      client.send({
        state: 'second update',
        action: 'update',
        session: '0',
      });
      await client.nextMessage;

      // third update [history: 1 > 2 > 3]
      client.send({
        state: 'third update',
        action: 'update',
        session: '0',
      });
      await client.nextMessage;

      // first undo [history: 1 > 2]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({
        session: '0',
        state: 'second update',
      });

      // second undo [history: 1]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({
        session: '0',
        state: 'first update',
      });

      // fourth update [history: 1 > 4]
      client.send({
        state: 'fourth update',
        action: 'update',
        session: '0',
      });
      await client.nextMessage;

      // fifth update [history: 1 > 4 > 5]
      client.send({
        state: 'fifth update',
        action: 'update',
        session: '0',
      });
      await client.nextMessage;

      // third undo [history: 1 > 4]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({
        session: '0',
        state: 'fourth update',
      });

      // fourth undo [history: 1]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({
        session: '0',
        state: 'first update',
      });
    }
  }, 10000);

  it('Uses custom state update mergers', async () => {
    await syncState.db.clearAllStates();
    syncState.merger.registerHandler(
      'counter',
      (serverState, oldState, newState) => serverState + newState - oldState
    );

    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    client1.send({
      state: 0,
      action: 'initial',
      session: 'counter',
    });
    await client1.nextMessage;

    client2.send({
      state: 0,
      action: 'initial',
      session: 'counter',
    });
    await client1.nextMessage;

    client1.send({
      state: 1,
      oldState: 0,
      action: 'update',
      session: 'counter',
    });
    await expect(client1).toReceiveClientMessage({
      session: 'counter',
      state: 1,
    });

    client2.send({
      state: 1,
      oldState: 0,
      action: 'update',
      session: 'counter',
    });
    await expect(client1).toReceiveClientMessage({
      session: 'counter',
      state: 2,
    });
  });

  it('Unsubscribes a client', async () => {
    await syncState.db.clearAllStates();
    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    // Subscribing both clients to session 0 and 1
    client1.send({
      state: 0,
      action: 'initial',
      session: '0',
    });
    await client1.nextMessage;
    client1.send({
      state: 0,
      action: 'initial',
      session: '1',
    });
    await client1.nextMessage;
    client2.send({
      state: 0,
      action: 'initial',
      session: '0',
    });
    await client1.nextMessage;
    client2.send({
      state: 0,
      action: 'initial',
      session: '1',
    });
    await client1.nextMessage;

    client2.send({
      state: 1,
      action: 'update',
      session: '0',
    });
    expect(client1).toReceiveClientMessage({session: '0', state: 1});

    client1.send({
      action: 'unsubscribe',
      session: '0',
    });

    client2.send({
      state: 2,
      action: 'update',
      session: '0',
    });
    client2.send({
      state: 3,
      action: 'update',
      session: '1',
    });
    expect(client1).toReceiveClientMessage({session: '1', state: 3});
  });

  it('can preprocess state as specified', async () => {
    await syncState.db.clearAllStates();

    syncState.processState = (statechange) => {
      if (statechange.action === 'update'){
        statechange.state = 4;
      }
      return statechange;
    };

    const client1 = new MockClient(WS_URI);
    await client1.connected;

    client1.send({
      state: 0,
      action: 'initial',
      session: 'count',
    });

    await expect(client1).toReceiveClientMessage({
      session: 'count',
      state: 0,
    });

    client1.send({
      state: 1,
      action: 'update',
      session: 'count',
    });

    await expect(client1).toReceiveClientMessage({
      session: 'count',
      state: 4,
    });

    client1.send({
      state: 5,
      action: 'update',
      session: 'count',
    });

    await expect(client1).toReceiveClientMessage({
      session: 'count',
      state: 4,
    });
  });
});
