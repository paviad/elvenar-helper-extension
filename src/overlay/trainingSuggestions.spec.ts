import { ArmyDetails, FriendlyUnitType } from '../model/armyDetails';
import { TOURNAMENT_GUIDES } from './tournamentGuide';
import { ALMANAC } from './testAlmanac';
import { resolveTrainingSuggestions } from './trainingSuggestions';

/** An elf city: elven barracks, mercenary camp and training grounds, but no human barracks. */
const ELF_UNITS = [
  'eb_hm_4',
  'eb_hm_5',
  'eb_hr_4',
  'eb_lr_4',
  'eb_ma_4',
  'mc_hm_5',
  'mc_hr_4',
  'mc_ma_4',
  'tg_lm_5',
  'tg_lr_4',
] as FriendlyUnitType[];

const armyDetails = (availableUnitTypeIds: FriendlyUnitType[], squads: [FriendlyUnitType, number][] = []) =>
  ({
    availableUnitTypeIds,
    unitSquads: squads.map(([unitTypeId, size]) => ({ __class__: 'UnitSquadVO', unitTypeId, size })),
  }) as ArmyDetails;

describe('resolveTrainingSuggestions', () => {
  const gems = TOURNAMENT_GUIDES.gems;

  it('returns nothing without a guide or an army', () => {
    expect(resolveTrainingSuggestions(undefined, armyDetails(ELF_UNITS), ALMANAC)).toEqual([]);
    expect(resolveTrainingSuggestions(gems, null, ALMANAC)).toEqual([]);
  });

  it('lists only the buildings the player owns', () => {
    const buildings = resolveTrainingSuggestions(gems, armyDetails(ELF_UNITS), ALMANAC).map((b) => b.building);

    // Gems suggests something from all four buildings, but this city has no human barracks.
    expect(buildings).toEqual(['eb', 'tg', 'mc']);
  });

  it('pairs each suggestion with the highest level the player has unlocked', () => {
    const elves = resolveTrainingSuggestions(gems, armyDetails(ELF_UNITS), ALMANAC).find((b) => b.building === 'eb');

    // Gems wants a Treant, the elven heavy melee, and this city has both level 4 and 5.
    const treant = elves?.suggestions.find((s) => s.troopType === 'hm');
    expect(treant?.unit?.unitTypeId).toBe('eb_hm_5');
  });

  it('leaves the unit unresolved when the class is not unlocked', () => {
    // Gems suggests the mercenary heavy melee (Vallorian); this city has no mc_hm at all.
    const withoutVallorian = ELF_UNITS.filter((id) => id !== 'mc_hm_5');
    const mercs = resolveTrainingSuggestions(gems, armyDetails(withoutVallorian), ALMANAC).find(
      (b) => b.building === 'mc',
    );

    const vallorian = mercs?.suggestions.find((s) => s.troopType === 'hm');
    expect(vallorian?.unit).toBeUndefined();
    expect(vallorian?.held).toBe(0);
  });

  it('totals the stock held of the matched unit', () => {
    const squads: [FriendlyUnitType, number][] = [
      ['eb_hm_5', 900],
      ['eb_hm_5', 350],
      // The level-4 Treant is a different unit and must not be counted towards the level 5.
      ['eb_hm_4', 4000],
    ];
    const elves = resolveTrainingSuggestions(gems, armyDetails(ELF_UNITS, squads), ALMANAC).find(
      (b) => b.building === 'eb',
    );

    expect(elves?.suggestions.find((s) => s.troopType === 'hm')?.held).toBe(1250);
  });

  it('puts the guide’s main picks before its alternates', () => {
    const mercs = resolveTrainingSuggestions(gems, armyDetails(ELF_UNITS), ALMANAC).find((b) => b.building === 'mc');
    const primaries = mercs?.suggestions.map((s) => s.primary);

    expect(primaries).toEqual([...primaries!].sort((a, b) => Number(b) - Number(a)));
    expect(mercs?.suggestions[0].troopType).toBe('hr');
  });
});
