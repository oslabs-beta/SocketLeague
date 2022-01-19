<p align="center">
  <img src="https://github.com/oslabs-beta/SocketLeague/blob/5bd79f9556de084e33323787a46da8e9c2442288/assets/images/Socket_League_Logo_.gif" alt="Socket League Logo"/>
</p>

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/oslabs-beta/SocketLeague/pulls)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/oslabs-beta/SocketLeague/dev/client-package?color=yellow)
![GitHub package.json version](https://img.shields.io/github/package-json/v/oslabs-beta/SocketLeague/dev/server-package?color=steelblue)

# SocketLeague: Websockets that transfer synced state

## Table of Contents

- [Features](#features)

- [Installation](#installation)

- [How It works](#how-it-works)

- [Demo Apps](#demo-apps)

- [Contributing](#contributing)

- [Authors](#authors)

## Features

A lightweight non-opinionated NPM library that offers a custom React hook that utilizes websockets to synchronize state between multiple clients and can evolve state dynamically, coupled with a server side NPM library containing a handler to receive messages from the hook on a websocket server which persists the state updates on a database and notifies clients of changes.

## Installation

1. ``npm install socket-league-client`` for access to the custom React hook.
2. ``npm install socket-league-server`` for access to the websocket server handler.

## How It works

### The Custom React Hook

Let's break down the components of the call to explain each part of the hook invocation.

#### The Connection Class

The ``Connection`` class wraps all the front-end logic to manage the hook. It should be initialized with the URL of the websocket server with which the client will be communicating state, and which will be sending state updates to the client. Under the hood, the Connection class automatically reconnects using the [Reconnecting WebSocket library](https://www.npmjs.com/package/reconnecting-websocket).

#### Initializing state and session

Our library gives developers the flexibility to transmit any data to represent the state in the hook. The hook anticipates that the communication protocol between server and client includes the entire state, not just incremental updates.

The ``session ID`` is how clients subscribe to state updates from the server when the server receives an update. The first time a ``session ID`` is received by the server, it saves the received state in the database. Otherwise, it updates the client with the already saved state information on the database instead.

##### Message Types

The ``Connection`` class sends three message types to the server: ``Initial``, ``Update``, and ``Undo``.

1. ``Initial``: This message type is the first message sent when the Connection object first contacts the server. The first time a ``session ID`` is received by the server, it saves the received state in the database. Otherwise, it updates the client with the already saved state information on the database instead.
2. ``Update``: After a websocket connection is established, any updates to the application state are transmitted to the server via the custom React hook through ``Update`` messages. Each reception of an ``Update`` message by the server causes the server to emit updates to all clients associated with that ``Update`` message's ``session ID``
3. ``Undo``: This message type notifes the server to delete the last state associated with the included ``session ID`` and transmit the last prior state associated with ``session ID`` to the client. This behavior can be customized  Nothing will happen if the state is regressed to the point of initial contact with the first client to initialize the earliest state associated with that ``session ID``.
4. ``Unsubscribe``: This message type notifies the server to stop sending updates to the client associated with the session included in the subsubscribe message. 

#### Initializing the hooks with useSyncState

Finally, to add the custom hook to the application, simply invoke ``useSyncState`` with the desired ``session ID``, the desired initial state, a ``Connection`` object, and the local version of React.

The version of React should be passed into useSyncState in order to avoid versioning and dependency issues.

```
  //outside the React component's render or return method
  const conn = new Connection ('ws://localhost:3000');

  //within the React component's render or return method
  const [socketState, setSocketState, undoSocketState] = useSyncState(
    session,
    initialState,
    conn,
    React
  );
```

### The synchronized hook server handler

#### The SyncHandler Class

A SyncHandler object should be instantiated with the database driver in which the state is to be tracked. If no database driver is specified, the default database driver will use JSON to track state.

Currently MongoDB and PostgresSQL are supported by pre-designed drivers. The TypeScript interface ``driver.ts`` provides the specifications for other drivers to implement.

Example 1: Instantiating the SyncHandler with MongoDB or Postgres as the database storing state.

``const syncHandler = new SyncHandler(new MongoDriver(`myURI`));``
``const syncHandler = new SyncHandler(new PostgresDriver(`myURI`));``

Example 2: Instantiating the SyncHandler with a JSON database.

``const syncHandler = new SyncHandler();``
is equivalent to
``const syncHandler = new SyncHandler(new JsonDriver());``

#### Connecting to the database

The SyncHandler does not automatically connect to the database driver provided on its invocation.``syncHandler.connect()`` should be used to initialize the asynchronous database connection. If the connected database driver is changed, ``syncHandler.connect()`` should be called again.

#### Attaching the SyncHandler to the Websocket Server such as ws

Finally, the SyncHandler object should be invoked during connection events for the websocket server implementation.

Below is the sample implementation for the [ws](https://www.npmjs.com/package/ws) library.

```
const syncHandler = new SyncHandler();
await syncHandler.connect();
const wsServer = new ws.Server({ noServer: true });
wsServer.on("connection", syncHandler.handleWsConnection);
```

#### Auto-Disconnect

By default, the SyncHandler automatically disconnects websockets that reach the close state while connected. This behavior can be changed by invoking the ``toggleAutoDisconnect()`` method.

```
const syncHandler = new SyncHandler();
console.log(syncHandler.toggleAutoDisconnect()); //returns and logs the current AutoDisconnect status.
```

#### State Merger

By default, the database preserves only the most recently received state. This behavior can be customized using the StateMerger class.

The properties of the merger can be accessed by calling ``.merger`` on the SyncHandler.

1. ``setDefaultHandler`` can be used to set custom behavior for conflicting states, for example by diffing or calculating which state to keep. 

```
const syncHandler = new SyncHandler();
syncHandler.merger.setDefaultHandler((serverState, oldState, newState) => Math.max( serverState + oldState, serverState + newState));
```

2. ``registerHandler`` can be used to set custom behavior for conflicting states, but only for specific sessions, if the conflict management behavior is only desired in specific cases. 

```
const syncHandler = new SyncHandler();
syncHandler.merger.registerHandler( '0', (serverState, oldState, newState) => Math.max( serverState + oldState, serverState + newState) );
```

#### Pre-processing State Changes

The SyncHandler can preprocess inputs received from clients for validity or encryption purposes.

A function can be set for this purpose by invoking ``setProcessState()``, which takes as a parameter the helper function containing the logic to process the state.

This helper function should take one parameter representing an object containing keys of ``state``, ``session``, and ``action`` type, as well as the ``oldState`` if applicable, and return the processed object containing those same keys.

```
const syncHandler = new SyncHandler();
syncHandler.setProcessState( (stateUpdate) => {console.log(stateUpdate.session), return stateUpdate} );
```

The helper function set using ``setProcessState()`` can be cleared by invoking ``resetProcessState()``.

```
syncHandler.resetProcessState();
```

## Demo Apps

##### Echo Server

[Check out our chat-app we built using our very own NPM libraries and hooks!](https://github.com/oslabs-beta/SocketLeague/tree/dev/echo-server-electron) 

Our Echo Server is a chat application with four separate channels for conversation. Clients are synchronized to the server via websockets, which transmit updates relating to any messages sent or background changes. Feel free to cruise around and see how exactly it all comes together.

## Contributing

We'd love for you to test this library out and submit any issues you encounter. Also feel free to fork to your own repo and submit pull requests!

## Authors

```
Kyle Boudewyn
Kurt Crandall
Aaron Gaut
Zachary Lim
Trevor Mow
```
