import React from "react";
import { useSyncState, Connection } from "socket-league";

//console.log(`Using same react instance? ${React === HookReact}`);

const socket = new WebSocket("ws://localhost:3000");

let message = "hello, I clicked a button!";


socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

function sendWebSocketMessage() {
  console.log("We are in the send update websocket message function");
  const msgObject = {};
  msgObject.state = []; //message.push(); 
  msgObject.state.push(message);
  msgObject.action = 'update';
  msgObject.session = '0';
  socket.send(JSON.stringify(msgObject));
}


function sendWebSocketUndoMessage(){
  console.log("We are in the send undo websocket message function");
  const msgObject = {};
  msgObject.state = message;
  msgObject.action = 'undo';
  msgObject.session = '0';
  socket.send(JSON.stringify(msgObject));
}


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
      //document.getElementById('echoTextDisplay').value = readState;
    };

    reader.readAsText(event.data);
  } else {
    console.log("Result: " + event.data);
  }
};

const conn = new Connection('ws://localhost:3000');

const App = () => {
  console.log('attempting to render app');
<<<<<<< HEAD
  // const [color, setColor] = useSyncState('red', conn, React);
  const sessionIdRoom1 = 0;
  const sessionIdRoom2 = 1;
  const [socketState, setSocketState] = useSyncState('No messages have been typed...', conn, React);
=======
  const [color, setColor, undoColor] = useSyncState('red', conn, React);
>>>>>>> dev
  return (
    <div>
      <h1>Socket League Demo (Anonymous Chat Room)</h1>
      <button onClick={() => setSocketState(sessionIdRoom1)}>Chat Room 1</button>
      <button onClick={() => setSocketState(sessionIdRoom2)}>Chat Room 2</button>
      <br></br>
      <textarea
        style={{width:'300px', height:'300px'}}
        className="textDisplay"
        id="echoTextDisplay"
      >{socketState}</textarea>
      <br></br>
      <input
        className="textInput"
        id="echoText"
        placeholder="what would you have me say?"
        onChange={(e) => (message = e.target.value)}
      ></input>
      <button onClick={sendWebSocketMessage}>Send</button>
      <button onClick={sendWebSocketUndoMessage}>Undo</button>
<<<<<<< HEAD
      <span>{socketState}</span>
=======
      <button onClick={() => setColor('blue')}>Blue</button>
      <button onClick={() => undoColor()}>Undo color</button>
      <span>{color}</span>
>>>>>>> dev
    </div>
  );
};

export default App;
