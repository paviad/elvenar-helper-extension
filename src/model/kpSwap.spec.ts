import { clampFullThreadPosts } from './kpSwap';

describe('clampFullThreadPosts', () => {
  it('takes a whole number as typed', () => {
    expect(clampFullThreadPosts('120')).toBe(120);
    expect(clampFullThreadPosts(' 150 ')).toBe(150);
  });

  it('rounds a fraction', () => {
    expect(clampFullThreadPosts('149.6')).toBe(150);
  });

  it('keeps it within a hundred and a thousand', () => {
    expect(clampFullThreadPosts('80')).toBe(100);
    expect(clampFullThreadPosts(50000)).toBe(1000);
  });

  it('has nothing to say about something that is not a number', () => {
    expect(clampFullThreadPosts('')).toBeUndefined();
    expect(clampFullThreadPosts('abc')).toBeUndefined();
  });
});
