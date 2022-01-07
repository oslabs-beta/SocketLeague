const dotenv = require("dotenv");

dotenv.config();

const { Server } = require('mock-socket');
const mongoose = require("mongoose");

const SyncHandler = require("../syncHandler.js");
const MockClient = require("../mockClient");

const PORT = 3000;
const WS_URI = `ws://localhost:${PORT}`;

describe("WebSocket Server", () => {
  let syncState;
  const wsServer = new Server(WS_URI);
  
  beforeAll(async () => {
    syncState = new SyncHandler(process.env.DB_URI);
    await syncState.connect();
    wsServer.on("connection", syncState.handleWsConnection);
  });

  afterAll(async () => {
    mongoose.connection.close();
  });

  it('Server clears the database', async () => {
    await syncState.__getDB().create({state: {}, session: "0"});
    await syncState.clearState();
    const sessionRecords = await syncState.__getDB().find();
    expect(sessionRecords).toEqual([]);
  });

  it('Client receives initial state when joining a new session', async () => {
    await syncState.clearState();
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'this is a test message',
      action: 'initial',
      session: '0'
    });
    await expect(client).toReceiveClientMessage({session:'0', state:'this is a test message'});
  });


  it("Server sends an existing state to the client when the client connects with a valid session ID", async () => {
    await syncState.clearState();
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

    await expect(client2).toReceiveClientMessage({session:'0', state:'initial state'});
  });

  it("Server broadcasts updated state to all clients with same session ID when it receives an updated state", async () => {
    await syncState.clearState();
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
    await expect(client2).toReceiveClientMessage({session:'0', state:'new message'});
  });

  it("Server broadcasts updated state to only appropriate clients when it receives an updated state", async () => {
    await syncState.clearState();
    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    client1.send({
      state: 'initialize client 1',
      action: 'initial',
      session: '4',
    });
    await expect(client1).toReceiveClientMessage({session:'4', state:'initialize client 1'});
    
    client2.send({
      state: 'initialize client 2',
      action: 'initial',
      session: '3',
    });
    await expect(client2).toReceiveClientMessage({session:'3', state:'initialize client 2'});

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
    await expect(client1).toReceiveClientMessage({session:'4', state:'session four update'});
    await expect(client2).toReceiveClientMessage({session:'3', state:'session three update'});
  });

  it("Server stores updates to the state in the database (upon receiving the update call).", async () => {
    await syncState.clearState();
    const client = new MockClient(WS_URI);
    await client.connected;
    
    client.send({
      state: 'initialize DB test on session 1',
      action: 'initial',
      session: '1',
    });
    await expect(client).toReceiveClientMessage({session:'1', state:'initialize DB test on session 1'});

    client.send({
      state: 'am i in the database?',
      action: 'update',
      session: '1',
    });
    await client.nextMessage;

    const sessionRecords = await syncState.__getDB().find({ 
      state: 'am i in the database?',
      session: "1",
    });
    expect(sessionRecords).toHaveLength(1);
  });

  it("Server reverts to the previous state stored in the database for a given session (upon receiving the undo call).", async () => {
    await syncState.clearState();
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
    await expect(client).toReceiveClientMessage({session:'0', state:'update1'});

    client.send({
      action: 'undo',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({session:'0', state:'initial state'});
  });

  it("Server reverts to correct state after three updates, two undos, two updates, and two undos.", async () => {
    await syncState.clearState();
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'initialize undo stress test',
      action: 'initial',
      session: '0',
    });
    await expect(client).toReceiveClientMessage({session:'0', state:'initialize undo stress test'});

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
      await expect(client).toReceiveClientMessage({session:'0', state:'second update'});

      // second undo [history: 1]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({session:'0', state:'first update'});

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
      await expect(client).toReceiveClientMessage({session:'0', state:'fourth update'});

      // fourth undo [history: 1]
      client.send({
        action: 'undo',
        session: '0',
      });
      await expect(client).toReceiveClientMessage({session:'0', state:'first update'});
    }
  }, 10000);
});

