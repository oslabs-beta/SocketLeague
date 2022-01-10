class StateMerger {
  constructor() {
    this._handlers = [];
    this._defaultHandler = (serverState, oldState, newState) => newState;
  }

  merge(session, serverState, oldState, newState) {
    for (const handler of this._handlers) {
      if (this.matches(handler.sessionPattern, session)) {
        return handler.func(serverState, oldState, newState);
      }
    }
    return this._defaultHandler(serverState, oldState, newState);
  }

  registerHandler(sessionPattern, func) {
    this._handlers.push({ sessionPattern, func });
  }

  setDefaultHandler(func) {
    this._defaultHandler = func;
  }

  matches(sessionPattern, session) {
    return sessionPattern === session;
  }
}

module.exports = StateMerger;