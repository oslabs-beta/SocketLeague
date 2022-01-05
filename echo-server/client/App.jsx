import React from 'react';
import { useSyncState, Connection } from 'socket-league-client';

//console.log(`Using same react instance? ${React === HookReact}`);

const socket = new WebSocket('ws://localhost:3000');

let message = 'hello, I clicked a button!';
let session_id = '0';
// const newContent = {
//   timestamp: new Date().toLocaleString(),
//   message,
//   user: 'anon',
// };

socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

function sendWebSocketMessage(socketState) {
  console.log('We are in the send update websocket message function');
  const msgObject = {};
  msgObject.state = [...socketState];
  const newContent = {
    timestamp: new Date().toLocaleString(),
    message,
    user: 'anon',
  };
  msgObject.state.push(newContent);
  //msgObject.state.push(message);
  msgObject.action = 'update';
  msgObject.session = session_id; //'0'
  console.log('we are about to attempt to send');
  conn._publish(msgObject);
  console.log('send successful');
}

function sendWebSocketUndoMessage(socketState) {
  console.log('We are in the send undo websocket message function');
  const msgObject = {};
  msgObject.state = [...socketState];
  msgObject.state.timestamp = new Date().toLocaleString();
  msgObject.state.message = message;
  msgObject.state.user = 'anon';
  msgObject.action = 'undo';
  msgObject.session = session_id; //'0'
  conn._publish(msgObject);
}

function joinSession0() {
  console.log('Welcome to chat room 1');
  session_id = '0';
  //ADD LOGIC TO INITIALIZE SESSION
}
function joinSession1() {
  console.log('Welcome to chat room 2');
  session_id = '1';
  //ADD LOGIC TO INITIALIZE SESSION
}

socket.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
  //console.log(`[message] Data received from server: ${JSON.parse(event.data)}`);
  if (event.data instanceof Blob) {
    const reader = new FileReader();

    //reader.onload is invoked as a result of readAsText
    reader.onload = () => {
      console.log('Result: ' + reader.result);
      //convert reader.result from a string to an object
      const readState = JSON.parse(reader.result);
      //we need to set this object as the state for the client
      console.log(readState);
    };

    reader.readAsText(event.data);
  } else {
    console.log('Result: ' + event.data);
  }
};

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
      `Time: ${socketState[i].timestamp} User: ${socketState[i].user} Message: ${socketState[i].message}`
    );
  }
  let session = session_id;
  console.log('socketstate is , ', socketState);
  console.log('textMsg is , ', textMsg);
  return (
    <div>
      <h1>Socket League Demo (Anonymous Chat Room)</h1>
      <button onClick={() => joinSession0()}>Chat Room 1</button>
      <button onClick={() => joinSession1()}>Chat Room 2</button>
      <span>Current Session ID is {session_id}</span>
      <br></br>
      <textarea
        style={{ width: '500px', height: '300px' }}
        className="textDisplay"
        id="echoTextDisplay"
        value={textMsg.join('\n')}
      ></textarea>
      <br></br>
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
      {/* <button onClick={() => setColor('blue')}>Blue</button> */}
      {/* <button onClick={() => undoColor()}>Undo color</button> */}
      {/* <span>{socketState}</span> */}
    </div>
  );
};

export default App;
