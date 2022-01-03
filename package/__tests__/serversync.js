import { WS } from "jest-websocket-mock";
import ws from "ws";
import jest from "jest-mock";
import dotenv from "dotenv";
import http from "http";
import WebSocket from "ws";

dotenv.config();

import SyncHandler from "../syncHandler.js";

describe("WebSocket Server", () => {
  let server;
  let syncState;
  //   const WS_URI = "ws://localhost:3000/socket-league-testing";
  const port = 3000;
  const wsServer = new ws.WebSocketServer({ port: port });
  const testMessage = "this is a test message";

  function startServer(port) {
    const server = http.createServer();
    return new Promise((resolve) => {
      server.listen(port, () => resolve(server));
    //   wsServer = new ws.Server({server})
    });
  }
  function waitForSocketState(socket, state) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (socket.readyState === state) {
          resolve();
        } else {
          console.log("state is ", state);
          waitForSocketState(socket, state).then(resolve);
        }
      }, 5);
    });
  }
  //we specify that when the connection state is reached by the websocket server, we will invoke handleWsConnection (see function above)

  beforeAll(async () => {
    // Start server
    server = await startServer(port);
    syncState = new SyncHandler(process.env.DB_URI); //change it later

    function handleWsConnection(socket) {
      syncState.addSocket(socket);
      console.log("Test connected to the websocket server");
      //we need to customize how state is transmitted to handle different use cases
      //right now message comes in as a string
      socket.on("message", (message) => {
        //we can put the synchandler here
        syncState.handleState(message);
      });
    }
    wsServer.on("connection", handleWsConnection);
  });
  afterAll(() => {
    // Close server
    server.close();
  });
  
  test("Server clears the database.", async () => {
   // 1. Create test client
   const client = new WebSocket(`ws://localhost:${port}`);
   // 2. Send client message
   let responseMessage;
   client.sentMessage = false;

   //we define three event listeners here, later on, when the websocket finishes connecting and enters the open state, each event triggers the next
   client.on("open", function open() {
     if (!client.sentMessage) {
       client.sentMessage = true;
       const msgObject = {};
       msgObject.state = "this is a test message";
       msgObject.action = "initial";
       msgObject.session = "0";
       client.send(JSON.stringify(msgObject));
     }
   });

   client.on("message", (data) => {
     if (data instanceof Blob) {
       const reader = new FileReader();
       //reader.onload is invoked as a result of readAsText
       reader.onload = () => {
         //convert reader.result from a string to an object
         const readState = JSON.parse(reader.result);
         //we need to set this object as the state for the client
         responseMessage = readState.state; //this should be 'this is a test message'
       };
       reader.readAsText(data);
     }
     // 3. Close the client after it receives the response
     client.close();
   });
     // 4. Perform assertions on the response
   client.on("close", (data) => {
     expect(responseMessage).toBe(testMessage); //confirm we have stuff in the DB
   });
   syncState.clearState();
   syncState.__getDB().find({ session: "0" })
   .then((sessionRecords) => {
    expect(sessionRecords).toBe([]);
   });
}
  );

  test("Server sends a state that exists to the client if the client connects to the state with a already used session  (upon receiving the initial call).", async () => {
    // 1. Create multiple test clients
    const client = new WebSocket(`ws://localhost:${port}`);
    const client2 = new WebSocket(`ws://localhost:${port}`);
    // 2. Send client message
    let responseMessage;
    client.sentMessage = false;
    client2.sentMessage = false;

    //we define three event listeners here, later on, when the websocket finishes connecting and enters the open state, each event triggers the next
    console.log('this is before the client.on portion');
    client.on("open", function open() {
      console.log('this is AFTER the client.on portion');
      if (!client.sentMessage) {
        client.sentMessage = true;
        const msgObject = {};
        msgObject.state = "initialize session";
        msgObject.action = "initial";
        msgObject.session = "0";
        client.send(JSON.stringify(msgObject));
      }
    });

    client.on("message", (data) => {
        client.close();
      });

      client2.on("open", function open() {
        if (!client.sentMessage) {
          client2.sentMessage = true;
          const msgObject = {};
          msgObject.state = "this is a test message";
          msgObject.action = "initial";
          msgObject.session = "0";
          client2.send(JSON.stringify(msgObject));
        }
      });

    client2.on("message", (data) => {
      if (data instanceof Blob) {
        const reader = new FileReader();
        //reader.onload is invoked as a result of readAsText
        reader.onload = () => {
          //convert reader.result from a string to an object
          const readState = JSON.parse(reader.result);
          //we need to set this object as the state for the client
          responseMessage = readState.state; //this should be 'this is a test message'
        };
        reader.readAsText(data);
      }
      // 3. Close the client after it receives the response
      console.log('response message is:', responseMessage);
      expect(responseMessage).toBe("dfsdfsdf");
      client2.close();

    });
      // 4. Perform assertions on the response
    client2.on("close", (data) => {
        expect(responseMessage).toBe("dfsdfsdf");
    });
  });

  test("Server initializes database state on receiving state from client with an invalid session id (upon receiving the initial call)", async () => {
    // 1. Create test client
    const client = new WebSocket(`ws://localhost:${port}`);
    // 2. Send client message
    let responseMessage;
    client.sentMessage = false;

    //we define three event listeners here, later on, when the websocket finishes connecting and enters the open state, each event triggers the next
    client.on("open", function open() {
      if (!client.sentMessage) {
        client.sentMessage = true;
        const msgObject = {};
        msgObject.state = "this is a test message";
        msgObject.action = "initial";
        msgObject.session = "1000";
        client.send(JSON.stringify(msgObject));
      }
    });

    client.on("message", (data) => {
      if (data instanceof Blob) {
        const reader = new FileReader();
        //reader.onload is invoked as a result of readAsText
        reader.onload = () => {
          //convert reader.result from a string to an object
          const readState = JSON.parse(reader.result);
          //we need to set this object as the state for the client
          responseMessage = readState.state; //this should be 'this is a test message'
        };
        reader.readAsText(data);
      }
      // 3. Close the client after it receives the response
      client.close();
    });
      // 4. Perform assertions on the response
    client.on("close", (data) => {
      expect(responseMessage).toBe(testMessage);
    });
  });

  xtest("Server broadcasts updated state to all clients when it receives an updated state", async () => {
    // 1. Create test client
    const client = new WebSocket(`ws://localhost:${port}`);
    await waitForSocketState(client, client.OPEN);
    // 2. Send client message
    // 3. Close the client after it receives the response
    // 4. Perform assertions on the response
    await waitForSocketState(client, client.CLOSED);
  });

  xtest("Server stores updates to the state in the database (upon receiving the update call).", async () => {
    // 1. Create test client
    const client = new WebSocket(`ws://localhost:${port}`);
    await waitForSocketState(client, client.OPEN);
    // 2. Send client message
    // 3. Close the client after it receives the response
    // 4. Perform assertions on the response
    await waitForSocketState(client, client.CLOSED);
  });
  
  xtest("Server can revert to the previous state stored in the database for a given session (upon receiving the undo call).", async () => {
    // 1. Create test client
    const client = new WebSocket(`ws://localhost:${port}`);
    await waitForSocketState(client, client.OPEN);
    // 2. Send client message
    // 3. Close the client after it receives the response
    // 4. Perform assertions on the response
    await waitForSocketState(client, client.CLOSED);
  });
});
