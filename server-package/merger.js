/**
 * @file stateMerger.js handles state merging to avoid conflicts
 */

/**
 * @class StateMerger used internally by SyncHandler to manage the merging of conflicting state updates
 */
class StateMerger {
  constructor() {
    this._handlers = [];
    this._defaultHandler = (serverState, oldState, newState) => newState;
  }

  /**
   * Merge the oldstate with the new state while avoiding any state conflicts
   * @param {String} session The id of the state's session
   * @param {Object} serverState The current value of the state according to the server
   * @param {Object} oldState The previous value of the state according to the client
   * @param {Object} newState The new value of the state according to the client
   * @return {Object} The new merged state
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
   * Register a function that handles merging state for any session matching the given pattern.
   * @param {String} sessionPattern A pattern for the sessions this handler applies to
   * @param {Function} func The merge function (takes server state, old client state, and new client state, and returns the merged state)
   */
  registerHandler(sessionPattern, func) {
    this._handlers.push({ sessionPattern, func });
  }

  /**
   * Sets the default handler
   * @param {Function} func The default merge function (takes server state, old client state, and new client state, and returns the merged state)
   */
  setDefaultHandler(func) {
    this._defaultHandler = func;
  }

  /**
   * Checks if a given session matches a pattern string. Currently only supports strict equality.
   * @param {String} sessionPattern The pattern that the session may match
   * @param {String} session The session ID to be checked against the sessionPattern
   * @return {Boolean} True if the given session matches the pattern
   */
  matches(sessionPattern, session) {
    return sessionPattern === session;
  }
}

module.exports = StateMerger;
