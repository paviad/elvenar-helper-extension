export const formatResourceName = (goodsNames: Record<string, string>, boostedGoods: string[], name: string) => {
  if (name.startsWith('unit_')) {
    return (
      {
        unit_1: 'Light Melee',
        unit_2: 'Light Ranged',
        unit_3: 'Mage',
        unit_4: 'Heavy Melee',
        unit_5: 'Heavy Ranged',
      }[name] || name
    );
  }
  if (name.startsWith('boosted_')) {
    const good = boostedGoodId(boostedGoods, name);
    return good ? goodsNames[good] || good : name;
  }
  return goodsNames[name] || name;
};

/**
 * The nine goods as the game's balancing data lays them out: `quality` is the tier, `chain` is
 * which of that tier's three it is. Every good carries both - the relics do too, which is where
 * these came from - and the sentient and ascended goods are these same nine ids under a prefix.
 */
const GOODS_BY_QUALITY = [
  ['marble', 'steel', 'planks'],
  ['crystal', 'scrolls', 'silk'],
  ['elixir', 'magic_dust', 'gems'],
];

/**
 * What a `boosted_...` id comes out as for this player.
 *
 * These are not resources but instructions - "the tier 3 good two along from the one you are
 * boosted in" - and the game reads all three sets the same way: take the chain of the player's
 * boosted COMMON good of that quality, step `plus` along that tier's three, and one step further
 * for sentient, two for ascended. The sentient and ascended sets are measured off the common boost
 * as well, never off their own, which is why a player's own sentient boost is their common one a
 * step along. The quality never moves.
 *
 * Nothing when the player has no boost in that tier, where the game gives up on the id too.
 */
const boostedGoodId = (boostedGoods: string[], name: string) => {
  const match = /^boosted_(ascended_|sentient_|)plus_(\d+)_quality_(\d+)$/.exec(name);
  if (!match) return undefined;
  const [, set, plus, quality] = match;
  const tier = GOODS_BY_QUALITY[parseInt(quality) - 1];
  // Only the common goods are bare ids in here, so a sentient boost cannot be mistaken for one.
  const boosted = tier?.findIndex((good) => boostedGoods.includes(good)) ?? -1;
  if (boosted === -1) return undefined;
  const steps = parseInt(plus) + (set === 'ascended_' ? 2 : set === 'sentient_' ? 1 : 0);
  return `${set.replace('_', '')}${tier[(boosted + steps) % 3]}`;
};
