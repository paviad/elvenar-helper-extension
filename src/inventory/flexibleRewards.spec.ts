import { GoodDefinition } from '../model/goodDefinition';
import { FlexibleRewardContext, resolveFlexibleReward, resolveRewardId } from './flexibleRewards';

const good = (id: string, type: string, quality: number, chain: number): GoodDefinition => ({
  id,
  name: id,
  type,
  quality,
  chain,
});

const goods: GoodDefinition[] = [
  good('marble', 'common', 1, 1),
  good('steel', 'common', 1, 2),
  good('planks', 'common', 1, 3),
  good('elixir', 'common', 3, 1),
  good('magic_dust', 'common', 3, 2),
  good('gems', 'common', 3, 3),
  good('sentientmarble', 'sentient', 1, 1),
  good('sentientsteel', 'sentient', 1, 2),
  good('sentientplanks', 'sentient', 1, 3),
  good('ascendedmarble', 'ascended', 1, 1),
  good('ascendedsteel', 'ascended', 1, 2),
  good('ascendedplanks', 'ascended', 1, 3),
  { id: 'mana', name: 'Mana' },
];

const context: FlexibleRewardContext = {
  flexibleRewards: [
    {
      id: 'frog_mana_RSK',
      rewards: [
        { type: 'good', subType: 'boosted_plus_0_quality_1', amount: 63 },
        { type: 'good', subType: 'boosted_plus_1_quality_3', amount: 120 },
        { type: 'resource', subType: 'mana', amount: 3200 },
      ],
    },
    {
      id: 'frog_runeshardspremium2',
      rewards: [{ type: 'runeShard', subType: 'aw1_shards', amount: 1 }],
    },
  ],
  chapter: 3,
  race: 'humans',
  boostedGoods: ['steel', 'gems'],
  goods,
};

describe('resolveFlexibleReward', () => {
  it("takes the player's chapter's reward, multiplied", () => {
    expect(resolveFlexibleReward({ type: 'flexible_reward', subType: 'frog_mana_RSK', amount: 10 }, context)).toEqual({
      type: 'resource',
      subType: 'mana',
      amount: 32000,
    });
  });

  it('fills the boosted good in', () => {
    const reward = { type: 'flexible_reward', subType: 'frog_mana_RSK', amount: 5 };

    expect(resolveFlexibleReward(reward, { ...context, chapter: 1 })).toEqual({
      type: 'good',
      subType: 'steel',
      amount: 315,
    });
    expect(resolveFlexibleReward(reward, { ...context, chapter: 2 })?.subType).toBe('elixir');
  });

  it("fills the player's race into a wonder of their own", () => {
    const reward = { type: 'flexible_reward', subType: 'frog_runeshardspremium2', amount: 1 };

    expect(resolveFlexibleReward(reward, { ...context, chapter: 1 })?.subType).toBe('b_humans_aw1_shards');
  });

  it('knows nothing of a chapter past the last, an unknown reward or an unknown chapter', () => {
    const reward = { type: 'flexible_reward', subType: 'frog_mana_RSK', amount: 10 };

    expect(resolveFlexibleReward(reward, { ...context, chapter: 4 })).toBeUndefined();
    expect(resolveFlexibleReward({ ...reward, subType: 'frog_unknown' }, context)).toBeUndefined();
    expect(resolveFlexibleReward(reward, { ...context, chapter: undefined })).toBeUndefined();
  });
});

describe('resolveRewardId', () => {
  it('counts along the chain from the boosted good of the tier, wrapping round', () => {
    expect(resolveRewardId('boosted_plus_0_quality_1', context)).toBe('steel');
    expect(resolveRewardId('boosted_plus_2_quality_1', context)).toBe('marble');
    expect(resolveRewardId('boosted_plus_0_quality_3', context)).toBe('gems');
  });

  it('steps a sentient good one further along, an ascended one two', () => {
    expect(resolveRewardId('boosted_sentient_plus_0_quality_1', context)).toBe('sentientplanks');
    expect(resolveRewardId('boosted_ascended_plus_0_quality_1', context)).toBe('ascendedmarble');
  });

  it('leaves the id be when the boosted good is not known', () => {
    expect(resolveRewardId('boosted_plus_0_quality_2', context)).toBe('boosted_plus_0_quality_2');
    expect(resolveRewardId('boosted_plus_0_quality_1', { ...context, goods: [] })).toBe('boosted_plus_0_quality_1');
  });

  it('leaves a plain id and, without a race, a race wonder be', () => {
    expect(resolveRewardId('mana', context)).toBe('mana');
    expect(resolveRewardId('aw2_shards', { ...context, race: undefined })).toBe('aw2_shards');
  });
});
