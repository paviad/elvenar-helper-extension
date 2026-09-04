import { Tome } from '../model/tome';
import { getTomeBuildings, isBuildingReward, resolveTomeBuildingId } from './tomeBuildings';

function makeTome(overrides: Partial<Tome> = {}): Tome {
  return {
    id: 'rsk_set_redbeard_xxiii',
    name: "Redbeard's Tome",
    description: '',
    rarity: 1,
    spellFragments: 50,
    iconId: 'rsk',
    type: 'one',
    rewards: [],
    ...overrides,
  };
}

describe('resolveTomeBuildingId', () => {
  it('fills the chapter in for the placeholder', () => {
    expect(resolveTomeBuildingId('A_Evt_Set_Redbeard_Cabin${chapter}', 18)).toBe('A_Evt_Set_Redbeard_Cabin_18');
  });

  it('leaves a subtype without a placeholder as it is', () => {
    expect(resolveTomeBuildingId('A_Evt_Set_Redbeard_Cabin_18', 20)).toBe('A_Evt_Set_Redbeard_Cabin_18');
  });

  it('only takes the chapter placeholder at the end', () => {
    expect(resolveTomeBuildingId('A_${chapter}_Cabin', 18)).toBe('A_${chapter}_Cabin');
  });

  it('cannot resolve a chapter placeholder with no chapter to fill in', () => {
    expect(resolveTomeBuildingId('A_Evt_Set_Redbeard_Cabin${chapter}', undefined)).toBeUndefined();
  });

  it('fills the race in, capitalised as the catalog writes it', () => {
    expect(resolveTomeBuildingId('P_${race}_Premium_Workshop${chapter}', 18, 'humans')).toBe(
      'P_Humans_Premium_Workshop_18',
    );
    expect(resolveTomeBuildingId('R_${race}_Premium_Residential${chapter}', 5, 'elves')).toBe(
      'R_Elves_Premium_Residential_5',
    );
  });

  it('cannot resolve a race placeholder without knowing the race', () => {
    expect(resolveTomeBuildingId('P_${race}_Premium_Workshop${chapter}', 18)).toBeUndefined();
  });
});

describe('isBuildingReward', () => {
  it('takes a reward the tome types as a building', () => {
    expect(isBuildingReward({ type: 'building', subType: 'A_Evt_Set_Redbeard_Cabin_18', amount: 1 })).toBe(true);
  });

  it('takes the placeholder as the mark of a building, whatever the type says', () => {
    expect(isBuildingReward({ type: 'city_entity', subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 })).toBe(
      true,
    );
  });

  it('leaves goods, items and flexible rewards out', () => {
    expect(isBuildingReward({ type: 'good', subType: 'money', amount: 1000 })).toBe(false);
    expect(isBuildingReward({ type: 'item', subType: 'INS_EVO_REDBEARD', amount: 1 })).toBe(false);
    expect(isBuildingReward({ type: 'flexible_reward', subType: 'frog_defaultpremium', amount: 10 })).toBe(false);
  });
});

describe('getTomeBuildings', () => {
  it('lists the buildings at the chapter the tome was won in, with what one opening yields', () => {
    const tome = makeTome({
      rewards: [
        { type: 'building', subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 },
        { type: 'good', subType: 'money', amount: 1000 },
        { type: 'building', subType: 'A_Evt_Set_Redbeard_Fence${chapter}', amount: 2 },
      ],
    });

    expect(getTomeBuildings(tome, 18)).toEqual([
      { buildingId: 'A_Evt_Set_Redbeard_Cabin_18', subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 },
      { buildingId: 'A_Evt_Set_Redbeard_Fence_18', subType: 'A_Evt_Set_Redbeard_Fence${chapter}', amount: 2 },
    ]);
  });

  it('fills the race in where a building names it', () => {
    const tome = makeTome({
      rewards: [{ type: 'building', subType: 'P_${race}_Premium_Workshop${chapter}', amount: 1 }],
    });

    expect(getTomeBuildings(tome, 18, 'elves')[0].buildingId).toBe('P_Elves_Premium_Workshop_18');
  });

  it('keeps a building whose id cannot be resolved, so it can still be named', () => {
    const tome = makeTome({
      rewards: [{ type: 'building', subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 }],
    });

    expect(getTomeBuildings(tome, undefined)).toEqual([
      { buildingId: undefined, subType: 'A_Evt_Set_Redbeard_Cabin${chapter}', amount: 1 },
    ]);
  });

  it('survives a tome that lists no rewards', () => {
    expect(getTomeBuildings(makeTome({ rewards: undefined as unknown as Tome['rewards'] }), 18)).toEqual([]);
  });
});
