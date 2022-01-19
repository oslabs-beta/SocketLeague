<p align="center">
  <img src="https://github.com/oslabs-beta/SocketLeague/blob/5bd79f9556de084e33323787a46da8e9c2442288/assets/images/Socket_League_Logo_.gif" alt="Socket League Logo"/>
</p>

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/oslabs-beta/SocketLeague/dev/echo-server-electron?color=steelblue)

# Socket-League: Echo Server

## Table of Contents

- [Features](#features)

- [Installation](#installation)

- [How It works](#how-it-works)

- [Contributing](#contributing)

- [Authors](#authors)

## Features

Our Echo Server is a chat application with four separate channels for conversation. Clients are synchronized to the server via websockets, which transmit updates relating to any messages sent or background changes. Feel free to cruise around and see how exactly it all comes together.

This repo includes both the back- and front-end of the application, and uses the Socket League SyncHandler's JSON DB option by default. Commented out code is present as an example of how to use a Driver object to convert the back-end to MongoDB, or another DB as desired.

## Installation

1. Clone this repo.
2. Run ``npm install``
3. Run ``npm run electron`` to start the server as well as the electron client.
4. Run ``npm run dist`` to build for MacOS only, or ``npm run dist-all`` to build for MacOS, Windows, and Linux.

## How It works

It is recommended to run the Socket League Echo Server client in full-screen to see the entire UI.

You can look through the code to see how our custom React Hook is used to implement the below functionality!

### Sending Messages

Simply type whatever you want into the box which says ``what would you have me say`` and then hit ``Send``! Thanks to the synchronized state across all open clients connected to the server, this message will appear on all clients viewing the Chat Room where the message was posted.

All messages have timestamps, localized to the client's timezone.

### Setting Username

In the box which says ``Username`` you may enter the username to be associated with your message.

Messages associated with the chosen ``Username`` will be displayed in glue. Messages from other users are displayed in grey.

### Changing Chat Room

There are four buttons at the top of the demo application: ``Chat Room 1``, ``Chat Room 2``, ``Chat Room 3``, and ``Chat Room 4``. Clicking each button changes the client to show only messages associated with the selected Chat Room, and unsubscribes the client from updates sent to other Chat Rooms. The currently visible Chat Room is not synchronized across clients.

### Changing Background

At the bottom of the application are three buttons: ``Gradient``, ``Delight``, and ``Rocket League``. Clicking each button changes the background for all clients linked to the server to the selected background.

## Contributing

We'd love for you to test this application out and submit any issues you encounter. Also feel free to fork to your own repo!

## Authors

```
Kyle Boudewyn
Kurt Crandall
Aaron Gaut
Zachary Lim
Trevor Mow
```
