import { diff } from 'jest-diff';

class MockClient {
  constructor(url) {
    this._socket = new WebSocket(url);
    this._pendingResolvers = [];
    this._readyMessages = [];

    let connectionResolver;
    this._isConnected = new Promise((resolve, reject) => {
      connectionResolver = resolve;
    });
    this._socket.onopen = () => {
      connectionResolver();
      this._socket.addEventListener('message', message => {
        const parsedMessage = JSON.parse(message.data);
        if (this._pendingResolvers.length) {
          this._pendingResolvers.shift()(parsedMessage);
        }
        else {
          this._readyMessages.push(new Promise((resolve, reject) => {
            resolve(parsedMessage);
          }));
        }
      });
    };
  }

  get connected() {
    return this._isConnected;
  }

  get nextMessage() {
    if (this._readyMessages.length) {
      return this._readyMessages.shift();
    }
    else {
      let resolver;
      const messagePromise = new Promise((resolve, reject) => resolver = resolve);
      this._pendingResolvers.push(resolver);
      return messagePromise;
    }
  }

  send(message) {
    this._socket.send(JSON.stringify(message));
  }
}

const WAIT_DELAY = 5000;
const TIMEOUT = Symbol("timoeut");

const makeInvalidClientMessage = function makeInvalidClientMessage(client, matcher) {
  return this.utils.matcherHint(this.isNot ? `.not.${matcher}` : `.${matcher}`, "MockClient", "expected") + "\n\n" + `Expected the client object to be a valid MockClient.\n` + `Received: ${typeof client}\n` + `  ${this.utils.printReceived(client)}`;
};

expect.extend({
  async toReceiveClientMessage(client, expected) {
    const isClient = client instanceof MockClient;

    if (!isClient) {
      return {
        pass: this.isNot,
        // always fail
        message: makeInvalidClientMessage.bind(this, client, "toReceiveClientMessage")
      };
    }

    let timeoutId;
    const messageOrTimeout = await Promise.race([
      client.nextMessage,
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve(TIMEOUT), WAIT_DELAY)
      }),
    ]);
    clearTimeout(timeoutId);

    if (messageOrTimeout === TIMEOUT) {
      return {
        pass: this.isNot,
        // always fail
        message: () => this.utils.matcherHint(this.isNot ? ".not.toReceiveClientMessage" : ".toReceiveClientMessage", "MockClient", "expected") + "\n\n" + `Expected the websocket client to receive a message,\n` + `but it didn't receive anything in ${WAIT_DELAY}ms.`
      };
    }

    const received = messageOrTimeout;
    const pass = this.equals(received, expected);
    const message = pass ? () => this.utils.matcherHint(".not.toReceiveClientMessage", "MockClient", "expected") + "\n\n" + `Expected the next received message to not equal:\n` + `  ${this.utils.printExpected(expected)}\n` + `Received:\n` + `  ${this.utils.printReceived(received)}` : () => {
      const diffString = diff(expected, received, {
        expand: this.expand
      });
      return this.utils.matcherHint(".toReceiveClientMessage", "MockClient", "expected") + "\n\n" + `Expected the next received message to equal:\n` + `  ${this.utils.printExpected(expected)}\n` + `Received:\n` + `  ${this.utils.printReceived(received)}\n\n` + `Difference:\n\n${diffString}`;
    };
    return {
      actual: received,
      expected,
      message,
      name: "toReceiveClientMessage",
      pass
    };
  },
});

export default MockClient;
export { MockClient };