![Socket League Logo](https://github.com/oslabs-beta/SocketLeague/blob/05ac3593c981402dc4adc8cdccccbd7dc225d56a/assets/images/Socket_League_Logo_.gif)

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

![The Custom React Hook](https://github.com/oslabs-beta/SocketLeague/blob/05ac3593c981402dc4adc8cdccccbd7dc225d56a/assets/images/Socket-League-Frontend-Hook.png)

Let's break down the components of the call to explain each part of the hook invocation.

#### The Connection Class

The ``Connection`` class wraps all the front-end logic to manage the hook. It should be initialized with the URL of the websocket server with which the client will be communicating state, and which will be sending state updates to the client.

#### Initializing state and session

Our library gives developers the flexibility to transmit any data to represent the state in the hook. The hook anticipates that the communication protocol between server and client includes the entire state, not just incremental updates.

The ``session ID`` is how clients subscribe to state updates from the server when the server receives an update. The first time a ``session ID`` is received by the server, it saves the received state in the database. Otherwise, it updates the client with the already saved state information on the database instead.

##### Message Types

The ``Connection`` class sends three message types to the server: ``Initial``, ``Update``, and ``Undo``.

1. ``Initial``: This message type is the first message sent when the Connection object first contacts the server. The first time a ``session ID`` is received by the server, it saves the received state in the database. Otherwise, it updates the client with the already saved state information on the database instead.
2. ``Update``: After a websocket connection is established, any updates to the application state are transmitted to the server via the custom React hook through ``Update`` messages. Each reception of an ``Update`` message by the server causes the server to emit updates to all clients associated with that ``Update`` message's ``session ID``
3. ``Undo``: This message type notifes the server to delete the last state associated with the included ``session ID`` and transmit the last prior state associated with ``session ID`` to the client. Nothing will happen if the state is regressed to the point of initial contact with the first client to initialize the earliest state associated with that ``session ID``.

#### Initializing the hooks with useSyncState

Finally, to add the custom hook to the application, simply invoke ``useSyncState`` with the desired ``session ID``, the desired initial state, a new invocation of ``Connection``, and the local version of React.

The version of React should be passed into useSyncState in order to avoid versioning and dependency issues.

```
  const [socketState, setSocketState, undoSocketState] = useSyncState(
    session,
    initialState,
    conn,
    React
  );
```

### The synchronized hook server handler

#### The SyncHandler Class

A SyncHandler object should be instantiated with the database URI in which the state is tracked. Currently MongoDB is supported.

``const syncHandler = new SyncHandler(`myURI`)``

#### Connecting to the database

``syncHandler.connect()`` should be used to initialize the asynchronous database connection. This method can be invoked with an optional parameter of a new URI to change the database in which the server tracks state. (e.g. ``syncHandler.connect('myNewURI')``)

#### Attaching the SyncHandler to the Websocket Server such as ws

Finally, the SyncHandler object should be invoked during connection events for the websocket server implementation.

Below is the sample implementation for the [ws](https://www.npmjs.com/package/ws) library.

``const wsServer = new ws.Server({ noServer: true });``
``wsServer.on("connection", syncHandler.handleWsConnection);``

## Demo Apps

- Echo Server

## Contributing

We'd love for you to test this library out and submit any issues you encounter.

## Authors

```
Kyle Boudewyn
Kurt Crandall
Aaron Gaut
Zachary Lim
Trevor Mow
```
