import { makeCityBlock } from '../testing/fixtures';
import { CityBlock } from './CityBlock';
import { blockMatchesSearch, createSearchMatcher, findMatchingBlockIds } from './searchMatcher';

describe('createSearchMatcher', () => {
  it('returns null for an empty term', () => {
    expect(createSearchMatcher('')).toBeNull();
  });

  it('matches substrings case-insensitively', () => {
    const matcher = createSearchMatcher('steel');

    expect(matcher?.('Steel Manufactory')).toBe(true);
    expect(matcher?.('STEEL')).toBe(true);
    expect(matcher?.('Marble Manufactory')).toBe(false);
  });

  it('treats a slash-wrapped term as a regex', () => {
    const matcher = createSearchMatcher('/mana|seeds/');

    expect(matcher?.('Mana Fountain')).toBe(true);
    expect(matcher?.('Seeds Nursery')).toBe(true);
    expect(matcher?.('Steel Manufactory')).toBe(false);
  });

  it('applies the regex case-insensitively', () => {
    expect(createSearchMatcher('/STEEL/')?.('steel works')).toBe(true);
  });

  it('supports anchors, which a substring search cannot express', () => {
    const matcher = createSearchMatcher('/^Steel/');

    expect(matcher?.('Steel Manufactory')).toBe(true);
    expect(matcher?.('Reinforced Steel')).toBe(false);
  });

  it('returns null for a regex that does not compile', () => {
    expect(createSearchMatcher('/[unclosed/')).toBeNull();
  });

  it('treats a bare pair of slashes as a substring search', () => {
    // Too short to be a regex, so it looks for a literal "//".
    const matcher = createSearchMatcher('//');

    expect(matcher?.('http://x')).toBe(true);
    expect(matcher?.('Steel')).toBe(false);
  });
});

describe('blockMatchesSearch', () => {
  const block = (over: Partial<CityBlock>) => makeCityBlock(over);

  it('never matches without a matcher', () => {
    expect(blockMatchesSearch(block({ name: 'Steel' }), null)).toBe(false);
  });

  it('matches on the block name', () => {
    expect(blockMatchesSearch(block({ name: 'Steel Manufactory' }), createSearchMatcher('steel'))).toBe(true);
  });

  it('matches on the block type', () => {
    expect(blockMatchesSearch(block({ name: 'Anything', type: 'culture' }), createSearchMatcher('culture'))).toBe(true);
  });

  it('does not match when neither field hits', () => {
    expect(blockMatchesSearch(block({ name: 'Steel', type: 'goods' }), createSearchMatcher('culture'))).toBe(false);
  });
});

describe('findMatchingBlockIds', () => {
  const blocks: Record<number, CityBlock> = {
    1: makeCityBlock({ id: 1, name: 'Steel Manufactory', type: 'goods' }),
    2: makeCityBlock({ id: 2, name: 'Marble Manufactory', type: 'goods' }),
    3: makeCityBlock({ id: 3, name: 'Statue', type: 'culture' }),
  };

  it('finds every block matching by name', () => {
    expect(findMatchingBlockIds(blocks, 'manufactory')).toEqual(new Set([1, 2]));
  });

  it('finds blocks matching by type', () => {
    expect(findMatchingBlockIds(blocks, 'culture')).toEqual(new Set([3]));
  });

  it('supports regex terms', () => {
    expect(findMatchingBlockIds(blocks, '/^(Steel|Statue)/')).toEqual(new Set([1, 3]));
  });

  it('returns nothing for an empty term', () => {
    expect(findMatchingBlockIds(blocks, '')).toEqual(new Set());
  });

  it('returns nothing for a term that matches no block', () => {
    expect(findMatchingBlockIds(blocks, 'zzz')).toEqual(new Set());
  });

  it('keys results by the record key', () => {
    const keyed: Record<number, CityBlock> = { 42: makeCityBlock({ id: 42, name: 'Steel' }) };

    expect(findMatchingBlockIds(keyed, 'steel')).toEqual(new Set([42]));
  });
});
