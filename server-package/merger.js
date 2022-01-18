/**
 * @class StateMerger
 * Used internally by SyncHandler to manage the merging of state updates
 */
class StateMerger {
  /**
   */
  constructor() {
    this._handlers = [];
    this._defaultHandler = (serverState, oldState, newState) => newState;
  }

  /**
   * @property {Function} merge
   * @param {*} session The id of the state's session
   * @param {*} serverState The current value of the state according to the server
   * @param {*} oldState The previous value of the state according to the client
   * @param {*} newState The new value of the state according to the client
   */
  merge(session, serverState, oldState, newState) {
    for (const handler of this._handlers) {
      if (this.matches(handler.sessionPattern, session)) {
        return handler.func(serverState, oldState, newState);
      }
    }
    return this._defaultHandler(serverState, oldState, newState);
  }

  /**
   * @property {Function} registerHandler
   * Register a function that handles merging state for any session
   * matching the given pattern.
   * @param {*} sessionPattern A pattern for the sessions this handler applies to
   * @param {*} func The merge function (takes server state, old client state, and new client state, and returns the merged state)
   */
  registerHandler(sessionPattern, func) {
    this._handlers.push({ sessionPattern, func });
  }

  /**
   * @property {Function} setDefaultHandler
   * @param {*} func The default merge function (takes server state, old client state, and new client state, and returns the merged state)
   */
  setDefaultHandler(func) {
    this._defaultHandler = func;
  }

  /**
   * @property {Function} matches
   * Checks if a given session matches a pattern string. Currently only supports
   * strict equality.
   * @param {*} sessionPattern The pattern that the session may match
   * @param {*} session
   */
  matches(sessionPattern, session) {
    return sessionPattern === session;
  }
}

module.exports = StateMerger;
