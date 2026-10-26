import { FlexibleReward } from '../model/flexibleReward';
import { GoodDefinition } from '../model/goodDefinition';
import { Reward } from '../model/tome';

/** What a flexible reward is worked out from, all of it the player's. */
export interface FlexibleRewardContext {
  flexibleRewards: FlexibleReward[];
  /** The chapter the player is in now, which is what the game sizes the reward to - not the tome's. */
  chapter: number | undefined;
  race: string | undefined;
  /** The player's boosted goods, as the city data lists them. */
  boostedGoods: string[];
  goods: GoodDefinition[];
}

/** Both of a race's own wonders are named for the race: `aw1_shards` is `b_humans_aw1_shards` to a human. */
const RACE_WONDER_SHARDS = /^aw\d+_shards$/;

/**
 * A good named by where it stands from the player's boosted good of its tier:
 * `boosted_plus_1_quality_3` is the tier 3 good one along the chain from the boosted one.
 */
const BOOSTED_GOOD = /^boosted_(?:(sentient|ascended)_)?plus_(\d+)_quality_(\d+)$/;

/** A sentient good is a step further along the chain than a common one, an ascended one two. */
const CHAIN_SHIFT: Record<string, number> = { common: 0, sentient: 1, ascended: 2 };

function resolveBoostedGood(id: string, { boostedGoods, goods }: FlexibleRewardContext): string | undefined {
  const match = BOOSTED_GOOD.exec(id);
  if (!match) {
    return undefined;
  }
  const set = match[1] ?? 'common';
  const quality = Number(match[3]);

  // The chain counts from the boosted common good, whatever the set asked for.
  const boosted = goods.find((g) => g.type === 'common' && g.quality === quality && boostedGoods.includes(g.id));
  if (!boosted?.chain) {
    return undefined;
  }
  const chain = ((boosted.chain + Number(match[2]) + CHAIN_SHIFT[set] - 1) % 3) + 1;

  return goods.find((g) => g.type === set && g.quality === quality && g.chain === chain)?.id;
}

/** The id a reward names once the player's race and boosted goods are filled in. */
export function resolveRewardId(id: string, context: FlexibleRewardContext): string {
  if (RACE_WONDER_SHARDS.test(id)) {
    return context.race ? `b_${context.race}_${id}` : id;
  }
  return resolveBoostedGood(id, context) ?? id;
}

/**
 * The reward a flexible one stands for at the player's chapter, its amount multiplied by the
 * one it was named with. Undefined when it is not a flexible reward the game has described,
 * or when the chapter is unknown.
 */
export function resolveFlexibleReward(reward: Reward, context: FlexibleRewardContext): Reward | undefined {
  const { chapter } = context;
  if (!chapter) {
    return undefined;
  }
  const entry = context.flexibleRewards.find((f) => f.id === reward.subType)?.rewards[chapter - 1];
  if (!entry) {
    return undefined;
  }
  return {
    type: entry.type,
    subType: resolveRewardId(entry.subType, context),
    amount: entry.amount * (reward.amount ?? 1),
  };
}
