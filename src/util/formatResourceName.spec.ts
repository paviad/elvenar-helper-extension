import { formatResourceName } from './formatResourceName';

/**
 * A real account's boosts, in the order the game sends them - tier 3 first, then 1, then 2. Not
 * tier order, which is the whole reason this cannot be a position in the list.
 *
 * Common elixir, steel and scrolls; the sentient and ascended entries the game sends are those
 * same three a step and two steps along their tier, which is the rule this file is about.
 */
const BOOSTS = [
  'elixir',
  'steel',
  'scrolls',
  'sentientmagic_dust',
  'sentientplanks',
  'sentientsilk',
  'ascendedgems',
  'ascendedmarble',
  'ascendedcrystal',
];

/** Another account, boosted in gems at tier 3 - which is what a Tinlug pays out for. */
const GEMS_BOOSTED = ['marble', 'silk', 'gems'];

/** What the goods list names, as the game's balancing data names it. */
const NAMES: Record<string, string> = {
  marble: 'Marble',
  steel: 'Steel',
  planks: 'Planks',
  elixir: 'Elixir',
  magic_dust: 'Magic Dust',
  gems: 'Gems',
  supplies: 'Supplies',
  sentientsteel: 'Platinum',
  sentientmagic_dust: 'Alloy Shrooms',
  sentientgems: 'Cosmic Bismuth',
};

describe('formatResourceName', () => {
  const named = (id: string, boosts = BOOSTS) => formatResourceName(NAMES, boosts, id);

  it('names a resource the goods list covers, and leaves one it does not alone', () => {
    expect(named('supplies')).toBe('Supplies');
    expect(named('spell_fragments')).toBe('spell_fragments');
  });

  it('names the units, which the goods list does not carry', () => {
    expect(named('unit_3')).toBe('Mage');
  });

  it('takes the tier from the id and the good from the boost in it', () => {
    // Steel is this account's tier 1 boost and elixir its tier 3 one - second and first in the
    // list it arrived in, which has nothing to do with either.
    expect(named('boosted_plus_0_quality_1')).toBe('Steel');
    expect(named('boosted_plus_0_quality_3')).toBe('Elixir');
  });

  it('steps along the three of that tier for a plus', () => {
    // Elixir is the first of the tier 3 three, so one step along is magic dust and two is gems.
    expect(named('boosted_plus_1_quality_3')).toBe('Magic Dust');
    expect(named('boosted_plus_2_quality_3')).toBe('Gems');
  });

  it('comes back round after three', () => {
    expect(named('boosted_plus_3_quality_3')).toBe('Elixir');
    expect(named('boosted_plus_4_quality_3')).toBe('Magic Dust');
  });

  it('starts a sentient good a step along and an ascended one two, off the common boost', () => {
    // Which is exactly what the game sends as this account's own sentient and ascended tier 3
    // boosts: magic dust and gems to its elixir.
    expect(named('boosted_sentient_plus_0_quality_3')).toBe('Alloy Shrooms');
    expect(named('boosted_ascended_plus_0_quality_3')).toBe('ascendedgems');
  });

  it('is what a Tinlug at level 18 pays out', () => {
    // Two steps and the sentient one make a full turn of the three, so it lands back on the
    // account's own tier 3 good - gems, as a sentient good.
    expect(named('boosted_sentient_plus_2_quality_3', GEMS_BOOSTED)).toBe('Cosmic Bismuth');
    // The same building at level 10 asks for a common tier 3 good instead.
    expect(named('boosted_plus_0_quality_3', GEMS_BOOSTED)).toBe('Gems');
  });

  it('gives back the id when the goods list has no name for what it lands on', () => {
    expect(named('boosted_ascended_plus_0_quality_3')).toBe('ascendedgems');
  });

  it('leaves the id alone when the player has no boost in that tier', () => {
    expect(named('boosted_plus_0_quality_1', ['gems'])).toBe('boosted_plus_0_quality_1');
  });

  it('leaves an id it cannot read alone', () => {
    expect(named('boosted_whatever_this_is')).toBe('boosted_whatever_this_is');
  });
});
