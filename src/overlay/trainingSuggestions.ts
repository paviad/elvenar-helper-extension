import { ArmyDetails, TrainingBuilding, TroopType } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { TournamentGuide, TrainingSuggestion } from './tournamentGuide';

/** The order buildings are listed in, matching how the guide presents its suggestions. */
export const BUILDING_ORDER: TrainingBuilding[] = ['eb', 'hb', 'tg', 'mc'];

export interface ResolvedSuggestion extends TrainingSuggestion {
  /** The player's own unit of this building and class, at its highest unlocked level. */
  unit?: BattleUnitType;
  held: number;
}

export interface BuildingSuggestions {
  building: TrainingBuilding;
  suggestions: ResolvedSuggestion[];
}

/**
 * Turns the guide's building-and-class advice into this player's actual units.
 *
 * The guide names units ("Treant", "Frog"), but those names change with upgrade level, so the
 * guide records the class instead and the pairing happens here — against whatever the player has
 * unlocked, at the highest level they have of it, with what is in stock.
 *
 * Only buildings the player owns are returned; the two barracks are mutually exclusive.
 */
export const resolveTrainingSuggestions = (
  guide: TournamentGuide | undefined,
  armyDetails: ArmyDetails | null,
  almanac: BattleUnitType[],
): BuildingSuggestions[] => {
  if (!guide || !armyDetails) return [];

  const stock: Record<string, number> = {};
  armyDetails.unitSquads.forEach((squad) => {
    stock[squad.unitTypeId] = (stock[squad.unitTypeId] || 0) + squad.size;
  });

  const owned = new Set<TrainingBuilding>();
  armyDetails.availableUnitTypeIds.forEach((id) => {
    const building = id.split('_')[0] as TrainingBuilding;
    if (BUILDING_ORDER.includes(building)) owned.add(building);
  });

  const bestUnlocked = (building: TrainingBuilding, troopType: TroopType) => {
    const prefix = `${building}_${troopType}_`;
    return armyDetails.availableUnitTypeIds
      .filter((id) => id.startsWith(prefix))
      .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)))[0];
  };

  return BUILDING_ORDER.filter((building) => owned.has(building)).map((building) => ({
    building,
    suggestions: guide.training
      .filter((suggestion) => suggestion.building === building)
      .map<ResolvedSuggestion>((suggestion) => {
        const unitTypeId = bestUnlocked(building, suggestion.troopType);
        return {
          ...suggestion,
          unit: almanac.find((u) => u.unitTypeId === unitTypeId),
          held: unitTypeId ? stock[unitTypeId] || 0 : 0,
        };
      })
      // The guide's main picks lead; its "also perhaps" units follow.
      .sort((a, b) => Number(b.primary) - Number(a.primary)),
  }));
};
