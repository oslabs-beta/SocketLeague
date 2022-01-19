<p align="center">
  <img src="https://github.com/oslabs-beta/SocketLeague/blob/5bd79f9556de084e33323787a46da8e9c2442288/assets/images/Socket_League_Logo_.gif" alt="Socket League Logo"/>
</p>

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/oslabs-beta/SocketLeague/pulls)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/oslabs-beta/SocketLeague?color=blue)

# socket-league-client: Websockets that transfer synced state

## Table of Contents

- [Features](#features)

- [Installation](#installation)

- [How It works](#how-it-works)

- [Demo Apps](#demo-apps)

- [Contributing](#contributing)

- [Authors](#authors)

## Features

A lightweight non-opinionated NPM library that offers a custom React hook that utilizes websockets to synchronize state between multiple clients and can evolve state dynamically, coupled with a server side NPM library [socket-league-server](https://www.npmjs.com/package/socket-league-server) which contains a handler to receive messages from the hook on a websocket server to persist state updates on a database and notifies clients of changes.

## Installation

``npm install socket-league-client`` for access to the custom React hook.

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

#### Server Setup

Now that your frontend is setup it is time to setup your backend. Please refer to the following NPM library for more information on how to set that up: [socket-league-server](https://www.npmjs.com/package/socket-league-server).

## Demo Apps

##### Echo Server

[Check out our chat-app we built using our very own NPM libraries and hooks!](https://github.com/oslabs-beta/SocketLeague/tree/dev/echo-server-electron) 

Our Echo Server is a chat application with four separate channels for conversation. Clients are synchronized to the server via websockets, which transmit updates relating to any messages sent or background changes. Feel free to cruise around and see how exactly it all comes together.

## Contributing

We'd love for you to test this library out and submit any issues you encounter. Also feel free to fork to your own repo and submit pull requests!

## Authors

```
Aaron Gaut
Kurt Crandall
Kyle Boudewyn
Trevor Mow
Zachary Lim
```
