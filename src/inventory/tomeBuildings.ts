import { Reward, Tome } from '../model/tome';

/**
 * A tome - the game's "reward selection kit" - is opened for one of a fixed set of rewards.
 * Where a reward is a building, its subtype ends in this placeholder rather than a chapter:
 * the tome remembers the chapter it was won in, and the game swaps that in when the tome is
 * opened. The game takes the placeholder itself as the mark of a building reward.
 */
const CHAPTER_PLACEHOLDER = /\$\{chapter\}$/;

/** A premium residence or workshop names the race the same way: `P_${race}_Premium_Workshop`. */
const RACE_PLACEHOLDER = /\$\{race\}/;

/** One building a tome can be opened for. */
export interface TomeBuilding {
  /** The catalog id with the placeholders filled in, or undefined when there is nothing to fill them with. */
  buildingId: string | undefined;
  /** The subtype as the tome lists it, which names the building when the catalog does not know it. */
  subType: string;
  /** How many of the building one opening yields. */
  amount: number;
}

export function isBuildingReward(reward: Reward): boolean {
  return reward.type === 'building' || CHAPTER_PLACEHOLDER.test(reward.subType);
}

/** The building id a tome reward stands for once the tome's chapter, and the player's race, are filled in. */
export function resolveTomeBuildingId(subType: string, chapter: number | undefined, race?: string): string | undefined {
  let id = subType;

  if (RACE_PLACEHOLDER.test(id)) {
    if (!race) {
      return undefined;
    }
    // The catalog writes the race capitalised: P_Humans_Premium_Workshop.
    id = id.replace(RACE_PLACEHOLDER, race.charAt(0).toUpperCase() + race.slice(1));
  }

  if (CHAPTER_PLACEHOLDER.test(id)) {
    if (chapter === undefined) {
      return undefined;
    }
    id = id.replace(CHAPTER_PLACEHOLDER, `_${chapter}`);
  }

  return id;
}

/** The buildings a tome can be opened for, at the chapter it was won in. */
export function getTomeBuildings(tome: Tome, chapter: number | undefined, race?: string): TomeBuilding[] {
  return (tome.rewards ?? []).filter(isBuildingReward).map((reward) => ({
    buildingId: resolveTomeBuildingId(reward.subType, chapter, race),
    subType: reward.subType,
    amount: reward.amount ?? 1,
  }));
}
