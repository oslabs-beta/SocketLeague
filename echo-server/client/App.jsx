import React, { useState } from 'react';
import { useSyncState, Connection } from 'socket-league-client';
import '../style.css';

let message = 'hello, I clicked a button!';

const conn = new Connection('ws://localhost:3000');

const App = () => {
  console.log('attempting to render app');
  const [session, setSession] = useState('0');

  const [socketState, setSocketState, undoSocketState] = useSyncState(
    session,
    '',
    conn,
    React
  );

  function sendWebSocketMessage() {
    console.log('We are in the send update websocket message function');
    const newMessage = {
      timestamp: new Date().toLocaleString(),
      message,
      user: document.getElementById('username').value,
    };
    setSocketState([...socketState, newMessage]);
  }

  const textMsg = [];
  for (let i = 0; i < socketState.length; i++) {
    if (socketState[i].user === document.getElementById('username').value) {
      textMsg.push(
        <tr>
          <div className="message-box-self">
            <p className="message-self">{socketState[i].message}</p>
            <p className="timestamp-user-self">
              {socketState[i].timestamp} ~ {socketState[i].user}
            </p>
          </div>
        </tr>
      );
    } else {
      textMsg.push(
        <tr>
          <div className="message-box-other">
            <p className="message-other">{socketState[i].message}</p>
            <p className="timestamp-user-other">
              {socketState[i].timestamp} ~ {socketState[i].user}
            </p>
          </div>
        </tr>
      );
    }
  }

  return (
    <div className="main-container">
      <div className="title">
        <h1>Socket League Demo (Chat Rooms)</h1>
      </div>
      <div className="sessionBtns">
        <button onClick={() => setSession('0')}>Chat Room 1</button>
        <button onClick={() => setSession('1')}>Chat Room 2</button>
        <button onClick={() => setSession('2')}>Chat Room 3</button>
        <button onClick={() => setSession('3')}>Chat Room 4</button>
      </div>
      <br></br>
      <div className="displayBox">
        <table>{textMsg}</table>
      </div>
      <br></br>
      <div className="userInputs">
        <input id="username" placeholder="Username"></input>
        <input
          className="textInput"
          id="echoText"
          placeholder="what would you have me say?"
          onChange={(e) => (message = e.target.value)}
        ></input>
        <button onClick={sendWebSocketMessage}>Send</button>
        <button onClick={undoSocketState}>Undo</button>
      </div>
    </div>
  );
};

export default App;
