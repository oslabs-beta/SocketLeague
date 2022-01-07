import React from 'react';
import { useSyncState } from 'socket-league-client';

export default ({ conn }) => {
  const [ number, setNumber, undoNumber ] = useSyncState('number', 0, conn, React);
  return <span id="number">{number}</span>;
}
