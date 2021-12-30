import React from "react";
import { useSyncState, Connection } from "socket-league";

//console.log(`Using same react instance? ${React === HookReact}`);

const socket = new WebSocket("ws://localhost:3000");

let message = "hello, I clicked a button!";

socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

function sendWebSocketMessage() {
  console.log("We are in the send websocket message function");
  const msgObject = {};
  msgObject.state = message;
  msgObject.action = 'update';
  msgObject.session = '0';
  socket.send(JSON.stringify(msgObject));
}


function sendWebSocketUndoMessage(){}


socket.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
  //console.log(`[message] Data received from server: ${JSON.parse(event.data)}`);
  if (event.data instanceof Blob) {
    const reader = new FileReader();

    //reader.onload is invoked as a result of readAsText
    reader.onload = () => {
      console.log("Result: " + reader.result);
      //convert reader.result from a string to an object
      const readState = JSON.parse(reader.result);
      //we need to set this object as the state for the client
      console.log(readState);
      document.getElementById('echoTextDisplay').value = readState;
    };

    reader.readAsText(event.data);
  } else {
    console.log("Result: " + event.data);
  }
};

const conn = new Connection('ws://localhost:3000');

const App = () => {
  console.log('attempting to render app');
  const [color, setColor] = useSyncState('red', conn, React);
  return (
    <div style={{color: color}}>
      <h1>Narcissus's Mirror</h1>
      <textarea
        className="textDisplay"
        id="echoTextDisplay"
        placeholder=""
      >{color}</textarea>
      <input
        className="textInput"
        id="echoText"
        placeholder="what would you have me say?"
        onChange={(e) => (message = e.target.value)}
      ></input>
      <button onClick={sendWebSocketMessage}>Send</button>
      <button onClick={sendWebSocketUndoMessage}>Undo</button>
      <button onClick={() => setColor('blue')}>Blue</button>
      <span>{color}</span>
    </div>
  );
};

export default App;
