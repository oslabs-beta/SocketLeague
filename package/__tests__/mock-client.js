import MockClient from '../mockClient';
import { WS } from 'jest-websocket-mock';

const WS_URI = 'ws://localhost:3000';

describe('MockClient', () => {
  let server;

  beforeEach(() => {
    server = new WS(WS_URI, { jsonProtocol: true });
  });

  afterEach(() => {
    WS.clean();
  });

  it('Connects to the server', async () => {
    const client = new MockClient(WS_URI);
    await server.connected;
    await client.connected;
  });

  it('Sends a message', async () => {
    const client = new MockClient(WS_URI);
    await client.connected;
    client.send({foo: 'hello'});
    await expect(server).toReceiveMessage({foo: 'hello'});
  });

  it('Receives a message', async () => {
    const client = new MockClient(WS_URI);
    await client.connected;
    server.send({foo: 'hello'});
    await expect(client).toReceiveClientMessage({foo: 'hello'});
  });

  it('Receives multiple messages in order', async () => {
    const client = new MockClient(WS_URI);
    await client.connected;
    for (let i = 0; i < 100; i++) {
      server.send({i});
    }
    for (let i = 0; i < 100; i++) {
      await expect(client).toReceiveClientMessage({i});
    }
  });
});