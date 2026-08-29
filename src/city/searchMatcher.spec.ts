import { makeCityBlock } from '../testing/fixtures';
import { CityBlock } from './CityBlock';
import { createSearchMatcher, findMatchingBlockIds } from './searchMatcher';

const block = (over: Partial<CityBlock>) => makeCityBlock(over);
const named = (name: string) => block({ name });
const sized = (width: number, length: number) => block({ width, length });

describe('createSearchMatcher', () => {
  it('returns null for an empty term', () => {
    expect(createSearchMatcher('')).toBeNull();
  });

  describe('with plain text', () => {
    it('matches substrings of the name case-insensitively', () => {
      const matcher = createSearchMatcher('steel');

      expect(matcher?.(named('Steel Manufactory'))).toBe(true);
      expect(matcher?.(named('STEEL'))).toBe(true);
      expect(matcher?.(named('Marble Manufactory'))).toBe(false);
    });

    it('matches on the block type', () => {
      expect(createSearchMatcher('culture')?.(block({ name: 'Anything', type: 'culture' }))).toBe(true);
    });

    it('does not match when neither field hits', () => {
      expect(createSearchMatcher('culture')?.(block({ name: 'Steel', type: 'goods' }))).toBe(false);
    });
  });

  describe('with a slash-wrapped term', () => {
    it('matches as a regex', () => {
      const matcher = createSearchMatcher('/mana|seeds/');

      expect(matcher?.(named('Mana Fountain'))).toBe(true);
      expect(matcher?.(named('Seeds Nursery'))).toBe(true);
      expect(matcher?.(named('Steel Manufactory'))).toBe(false);
    });

    it('applies the regex case-insensitively', () => {
      expect(createSearchMatcher('/STEEL/')?.(named('steel works'))).toBe(true);
    });

    it('supports anchors, which a substring search cannot express', () => {
      const matcher = createSearchMatcher('/^Steel/');

      expect(matcher?.(named('Steel Manufactory'))).toBe(true);
      expect(matcher?.(named('Reinforced Steel'))).toBe(false);
    });

    it('returns null for a regex that does not compile', () => {
      expect(createSearchMatcher('/[unclosed/')).toBeNull();
    });

    it('treats a bare pair of slashes as a substring search', () => {
      // Too short to be a regex, so it looks for a literal "//".
      const matcher = createSearchMatcher('//');

      expect(matcher?.(named('http://x'))).toBe(true);
      expect(matcher?.(named('Steel'))).toBe(false);
    });
  });

  describe('with a size', () => {
    it('matches the exact footprint', () => {
      const matcher = createSearchMatcher('7x3');

      expect(matcher?.(sized(7, 3))).toBe(true);
      expect(matcher?.(sized(3, 7))).toBe(false);
      expect(matcher?.(sized(7, 4))).toBe(false);
    });

    it('matches any length when only the width is given', () => {
      const matcher = createSearchMatcher('7x');

      expect(matcher?.(sized(7, 3))).toBe(true);
      expect(matcher?.(sized(7, 5))).toBe(true);
      expect(matcher?.(sized(3, 7))).toBe(false);
    });

    it('matches any width when only the length is given', () => {
      const matcher = createSearchMatcher('x3');

      expect(matcher?.(sized(7, 3))).toBe(true);
      expect(matcher?.(sized(2, 3))).toBe(true);
      expect(matcher?.(sized(3, 7))).toBe(false);
    });

    it('compares whole dimensions rather than runs of digits', () => {
      expect(createSearchMatcher('3x1')?.(sized(3, 12))).toBe(false);
      expect(createSearchMatcher('3x1')?.(sized(13, 1))).toBe(false);
      expect(createSearchMatcher('1x')?.(sized(13, 1))).toBe(false);
      expect(createSearchMatcher('x1')?.(sized(1, 12))).toBe(false);
    });

    it('leaves the name and type out of it', () => {
      const lookalike = block({ name: '7x3 Plot', type: '7x3', width: 2, length: 2 });

      expect(createSearchMatcher('7x3')?.(lookalike)).toBe(false);
    });

    it('still takes a bare x to the names', () => {
      const matcher = createSearchMatcher('x');

      expect(matcher?.(block({ name: 'Axe Smithy', width: 7, length: 3 }))).toBe(true);
      expect(matcher?.(block({ name: 'Steel', type: 'goods', width: 7, length: 3 }))).toBe(false);
    });
  });
});

describe('findMatchingBlockIds', () => {
  const blocks: Record<number, CityBlock> = {
    1: makeCityBlock({ id: 1, name: 'Steel Manufactory', type: 'goods', width: 3, length: 4 }),
    2: makeCityBlock({ id: 2, name: 'Marble Manufactory', type: 'goods', width: 4, length: 3 }),
    3: makeCityBlock({ id: 3, name: 'Statue', type: 'culture', width: 1, length: 4 }),
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

  it('finds blocks by footprint, whole or in part', () => {
    expect(findMatchingBlockIds(blocks, '3x4')).toEqual(new Set([1]));
    expect(findMatchingBlockIds(blocks, 'x4')).toEqual(new Set([1, 3]));
    expect(findMatchingBlockIds(blocks, '4x')).toEqual(new Set([2]));
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
