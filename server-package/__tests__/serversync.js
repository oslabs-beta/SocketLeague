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

    function handleWsConnection(socket) {
      syncState.addSocket(socket);
      socket.on("message", (message) => {
        syncState.handleState(message);
      });
    }
    wsServer.on("connection", handleWsConnection);
  });

  afterAll(async () => {
    mongoose.connection.close();
  });

  it('Server clears the database', async () => {
    await syncState.clearState();
    const sessionRecords = await syncState.__getDB().find({ session: "0" });
    expect(sessionRecords).toEqual([]);
  });

  it('Client receives initial state when joining a new session', async () => {
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      state: 'this is a test message',
      action: 'initial',
      session: '0'
    });
    await expect(client).toReceiveClientMessage('this is a test message');
  });


  it("Server sends an existing state to the client when the client connects with a valid session ID", async () => {
    const client = new MockClient(WS_URI);
    await client.connected;
    
    client.send({
      state: 'this is a test message',
      action: 'initial',
      session: '0',
    });
    await expect(client).toReceiveClientMessage('this is a test message');
  });

  it("Server broadcasts updated state to all clients when it receives an updated state", async () => {
    const client1 = new MockClient(WS_URI);
    const client2 = new MockClient(WS_URI);
    await client1.connected;
    await client2.connected;

    client1.send({
      state: 'new message',
      action: 'update',
      session: '0',
    });
    await expect(client2).toReceiveClientMessage('new message');
  });

  it("Server stores updates to the state in the database (upon receiving the update call).", async () => {
    const client = new MockClient(WS_URI);
    await client.connected;
    
    client.send({
      state: 'am i in the database?',
      action: 'update',
      session: '0',
    });
    await client.nextMessage;

    const sessionRecords = await syncState.__getDB().find({ 
      state: 'am i in the database?',
      session: "0",
    });
    expect(sessionRecords).toHaveLength(1);
  });

  it("Server reverts to the previous state stored in the database for a given session (upon receiving the undo call).", async () => {
    const client = new MockClient(WS_URI);
    await client.connected;

    client.send({
      action: 'undo',
      session: '0',
    });
    await expect(client).toReceiveClientMessage('new message');

    client.send({
      action: 'undo',
      session: '0',
    });
    await expect(client).toReceiveClientMessage('this is a test message');
  });
});

