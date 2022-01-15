import React from 'react';
import { useSyncState } from 'socket-league-client';

export default ({ conn }) => {
  const [ number, setNumber, undoNumber ] = useSyncState('number', 0, conn);
  return <>
    <span id="loaded">Page is loaded</span>
    <span id="number">{number}</span>
    <button id="increment" onClick={() => setNumber(number + 1)}>Increment</button>
    <button id="undo" onClick={() => undoNumber()}>Undo</button>
  </>;
};
