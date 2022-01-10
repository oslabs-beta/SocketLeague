const StateMerger = require('../merger');

describe('StateMerger', () => {
  let merger;

  beforeEach(() => {
    merger = new StateMerger();
  });

  it('Returns the new state by default', () => {
    expect(merger.merge('unknown', 'junk1', 'junk2', 'newState')).toEqual('newState');
  });

  it('Uses a registered handler', () => {
    const handler = jest.fn();
    merger.registerHandler('session1', handler);
    merger.merge('session1', 'junk1', 'junk2', 'junk3');
    expect(handler).toHaveBeenCalled();
  });

  it('Works for incrementing', () => {
    merger.registerHandler('counter', (serverState, oldState, newState) => {
      return serverState + newState - oldState;
    });
    let state = 0;

    state = merger.merge('counter', state, 0, 1)
    expect(state).toEqual(1);

    state = merger.merge('counter', state, 0, 1)
    expect(state).toEqual(2);

    state = merger.merge('counter', state, 0, 1)
    expect(state).toEqual(3);

    state = merger.merge('counter', state, 2, 3)
    expect(state).toEqual(4);
  });
});