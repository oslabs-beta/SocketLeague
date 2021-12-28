import React from "react";

const socket = new WebSocket("ws://localhost:3000");

let message = 'hello, I clicked a button!';

socket.onerror = function (error) {
  alert(`[error] ${error.message}`);
};

function sendWebSocketMessage() {
  socket.send(message);
}
//
socket.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
  //console.log(`[message] Data received from server: ${JSON.parse(event.data)}`);
  if (event.data instanceof Blob) {
    const reader = new FileReader();

    reader.onload = () => {
      console.log("Result: " + reader.result);
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
      <input
        className="textInput"
        id="echoText"
        placeholder="what would you have me say?"
        onChange={(e) => message = (e.target.value)}
      ></input>
      <button onClick={sendWebSocketMessage}>Send</button>
    </div>
  );
};

export default App;
