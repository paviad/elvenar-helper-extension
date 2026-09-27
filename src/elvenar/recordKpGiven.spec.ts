import {
  AncientWonderPhase,
  AncientWonderPhaseClass,
  ContributionClass,
  PlayerClass,
} from '../model/ancientWonderPhase';
import { KpGiven } from '../model/kpGiven';
import { recordKpGiven } from './recordKpGiven';

const ME = 848933052;
const OWNER = 850216399;

const phase = (
  mine: number | undefined,
  { owner = OWNER, baseName = 'B_Gr5_AW1', invested = 185, required = 560, runes = false } = {},
): AncientWonderPhase => ({
  __class__: runes ? AncientWonderPhaseClass.RunesPhaseVO : AncientWonderPhaseClass.ResearchPhaseVO,
  playerId: owner,
  entityBaseName: baseName,
  resourceId: `${baseName.toLowerCase()}_shards`,
  investedKnowledgePoints: invested,
  requiredKnowledgePoints: required,
  contributions: [
    // Empty chest slots are listed as contributions from a player of their own.
    {
      __class__: ContributionClass.ResearchContributionVO,
      rank: 2,
      player: { __class__: PlayerClass.PlayerVO, player_id: -3, name: 'Reward chest is available' },
    },
    ...(mine === undefined
      ? []
      : [
          {
            __class__: ContributionClass.ResearchContributionVO,
            rank: 1,
            player: { __class__: PlayerClass.PlayerVO, player_id: ME, name: 'Me' },
            knowledgePoints: mine,
          },
        ]),
  ],
});

const T = 1_790_000_000;

const after = (...steps: AncientWonderPhase[][]): KpGiven =>
  steps.reduce<KpGiven>((given, phases, i) => recordKpGiven(given, phases, ME, T + i), { standing: {}, gifts: [] });

describe('recordKpGiven', () => {
  it('reads a gift as the rise in your total since the wonder was opened', () => {
    const given = after([phase(145, { invested: 165 })], [phase(165, { invested: 185 })]);

    expect(given.gifts).toEqual([{ ownerId: OWNER, baseName: 'B_Gr5_AW1', amount: 20, at: T + 1 }]);
  });

  it('counts a first gift to a wonder you had never given to', () => {
    const given = after([phase(undefined, { invested: 280 })], [phase(20, { invested: 300 })]);

    expect(given.gifts.map((g) => g.amount)).toEqual([20]);
  });

  it('only marks a wonder it has not seen before, however much you have in it', () => {
    const given = after([phase(165)]);

    expect(given.gifts).toEqual([]);
    expect(given.standing[`${OWNER}:B_Gr5_AW1`].mine).toBe(165);
  });

  it('records nothing for the same phase arriving twice', () => {
    const given = after(
      [phase(145, { invested: 165 })],
      [phase(165, { invested: 185 })],
      [phase(165, { invested: 185 })],
    );

    expect(given.gifts.map((g) => g.amount)).toEqual([20]);
  });

  it('counts rapid gifts once each, however late and out of order their reports arrive', () => {
    // Five 20 KP items in quick succession. Each answers over HTTP and is echoed down the
    // socket, and the echoes land late, behind newer reports.
    const at = (mine: number) => phase(mine, { invested: 100 + mine });
    const given = after(
      [at(0)],
      [at(20)],
      [at(40)],
      [at(20)],
      [at(60)],
      [at(40)],
      [at(80)],
      [at(60)],
      [at(100)],
      [at(80)],
      [at(100)],
    );

    expect(given.gifts.reduce((sum, g) => sum + g.amount, 0)).toBe(100);
    expect(given.standing[`${OWNER}:B_Gr5_AW1`].mine).toBe(100);
  });

  it('ignores a late report from the level before', () => {
    const given = after(
      [phase(165, { invested: 500, required: 560 })],
      [phase(30, { invested: 40, required: 600 })],
      [phase(165, { invested: 500, required: 560 })],
    );

    expect(given.gifts.map((g) => g.amount)).toEqual([30]);
  });

  it('counts all of your total in a level that has moved on since', () => {
    const given = after([phase(165, { invested: 500, required: 560 })], [phase(30, { invested: 40, required: 600 })]);

    expect(given.gifts.map((g) => g.amount)).toEqual([30]);
  });

  it('keeps each wonder apart', () => {
    const given = after(
      [phase(10, { baseName: 'B_Gr5_AW1' }), phase(0, { baseName: 'B_Gr6_AW1', invested: 145, required: 210 })],
      [phase(10, { baseName: 'B_Gr5_AW1' }), phase(20, { baseName: 'B_Gr6_AW1', invested: 165, required: 210 })],
    );

    expect(given.gifts).toEqual([{ ownerId: OWNER, baseName: 'B_Gr6_AW1', amount: 20, at: T + 1 }]);
  });

  it('leaves out your own wonders and ones collecting runes', () => {
    const given = after(
      [phase(0, { owner: ME }), phase(0, { runes: true })],
      [phase(50, { owner: ME }), phase(50, { runes: true })],
    );

    expect(given).toEqual({ standing: {}, gifts: [] });
  });

  it('lets old gifts go', () => {
    const old = recordKpGiven(after([phase(0)], [phase(20)]), [], ME, T + 31 * 24 * 60 * 60);

    expect(old.gifts).toEqual([]);
  });
});
