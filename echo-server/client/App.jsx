import React from 'react';
import { useSyncState, Connection } from 'socket-league-client';
import '../style.css';

const socket = new WebSocket('ws://localhost:3000');
let message = 'hello, I clicked a button!';
let session_id = '0';

socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

/**
 * This function formats the message in an object
 * called msgObject and sends it to the web socket
 * @param socketState is the current state
 */
function sendWebSocketMessage(socketState) {
  console.log('We are in the send update websocket message function');
  const username = document.getElementById('username').value;
  const msgObject = {};
  msgObject.state = [...socketState];
  const newContent = {
    timestamp: new Date().toLocaleString(),
    message,
    user: username,
  };
  msgObject.state.push(newContent);
  msgObject.action = 'update';
  msgObject.session = session_id;
  console.log('we are about to attempt to send');
  conn._publish(msgObject);
  console.log('send successful');
  document.getElementById('echoText').value = '';
}

/**
 * This function will undo the most recent state change
 * @param socketState is the current state
 */
function sendWebSocketUndoMessage(socketState) {
  console.log('We are in the send undo websocket message function');
  const username = document.getElementById('username').value;
  const msgObject = {};
  // are the below 4 lines needed for the undo function? I think all we need is action and session
  msgObject.state = [...socketState];
  msgObject.state.timestamp = new Date().toLocaleString();
  msgObject.state.message = message;
  msgObject.state.user = username;
  msgObject.action = 'undo';
  msgObject.session = session_id;
  conn._publish(msgObject);
}

/**
 * Function to handle session joining
 * @param session This is the session id that is being joined
 */
function joinSession(session) {
  console.log(`Welcome to chat room ${session}`);
  session_id = session;
  //ADD LOGIC TO INITIALIZE SESSION
}

const conn = new Connection('ws://localhost:3000');

const App = () => {
  console.log('attempting to render app');
  const [socketState, setSocketState, undoSocketState] = useSyncState(
    '',
    conn,
    React
  );
  const textMsg = [];
  for (let i = 0; i < socketState.length; i++) {
    textMsg.push(
      `[${socketState[i].timestamp}] ${socketState[i].user}: ${socketState[i].message}`
    );
  }
  let session = session_id;
  console.log('socketstate is , ', socketState);
  console.log('textMsg is , ', textMsg);
  return (
    <div className="main-container">
      <div className="title">
        <h1>Socket League Demo (Chat Room)</h1>
      </div>
      <div className="sessionBtns">
        <button onClick={() => joinSession(0)}>Chat Room 1</button>
        <button onClick={() => joinSession(1)}>Chat Room 2</button>
        <button onClick={() => joinSession(2)}>Chat Room 3</button>
        <button onClick={() => joinSession(3)}>Chat Room 4</button>
        <span>Session ID is {session_id}</span>
      </div>
      <br></br>
      <div className="displayBox">
        <textarea
          className="textDisplay"
          id="echoTextDisplay"
          value={textMsg.join('\n')}
        ></textarea>
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
        <button onClick={() => sendWebSocketMessage(socketState)}>Send</button>
        <button onClick={() => sendWebSocketUndoMessage(socketState)}>
          Undo
        </button>
      </div>
    </div>
  );
};

export default App;
