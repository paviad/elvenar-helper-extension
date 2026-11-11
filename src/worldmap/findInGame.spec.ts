import { parseFindInGame } from './findInGame';

const NOW = 10_000_000;

describe('parseFindInGame', () => {
  it('reads a fresh request', () => {
    expect(parseFindInGame(JSON.stringify({ r: -25, q: 0, sentAt: NOW - 1000 }), NOW)).toEqual({
      r: -25,
      q: 0,
      sentAt: NOW - 1000,
    });
  });

  it('lets an old request go', () => {
    expect(parseFindInGame(JSON.stringify({ r: 1, q: 2, sentAt: NOW - 31 * 60 * 1000 }), NOW)).toBeUndefined();
  });

  it('takes nothing, and anything that is not a request, as none', () => {
    expect(parseFindInGame(undefined, NOW)).toBeUndefined();
    expect(parseFindInGame('', NOW)).toBeUndefined();
    expect(parseFindInGame('{', NOW)).toBeUndefined();
    expect(parseFindInGame(JSON.stringify({ r: 1, sentAt: NOW }), NOW)).toBeUndefined();
  });
});
