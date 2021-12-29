import React from "react";

const socket = new WebSocket("ws://localhost:3000");

let message = "hello, I clicked a button!";

socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

function sendWebSocketMessage() {
  socket.send(message);
}
function sendWebSocketUndoMessage(){}
//
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
      document.getElementById('echoTextDisplay').value = readState;
    };

    reader.readAsText(event.data);
  } else {
    console.log("Result: " + event.data);
  }
};

const App = () => {
  return (
    <div>
      <h1>Narcissus's Mirror</h1>
      <textarea
        className="textDisplay"
        id="echoTextDisplay"
        placeholder=""
      ></textarea>
      <input
        className="textInput"
        id="echoText"
        placeholder="what would you have me say?"
        onChange={(e) => (message = e.target.value)}
      ></input>
      <button onClick={sendWebSocketMessage}>Send</button>
      <button onClick={sendWebSocketUndoMessage}>Undo</button>
    </div>
  );
};

export default App;
