import { PotionEffect } from '../model/potionEffect';

/*
 * A record of each brew and what its Trophy Goblets gave, kept to work out how the server sets an
 * effect's strength and duration. The client only knows the most a brew can give: the effect's
 * strength and duration at its level, times what the Spell Fragments add. What a goblet actually
 * gives is the server's choice, so the inputs and the results are kept side by side.
 */

/** An effect as it stood when the brew started. */
export interface CauldronEffectLevel {
  id: string;
  state: string;
  level: number;
  boost: number;
  duration: number;
  nextBoost: number;
  nextDuration: number;
}

/**
 * One goblet's result as the server sent it. Exactly one of `success`, `failure` and `conflict`
 * is set; a conflict is an effect an earlier goblet of the same brew already gave.
 */
export interface GobletResult {
  /** Counts down with each goblet, so it tells the goblets of one brew apart. */
  gobletsLeft: number;
  success?: unknown;
  failure?: unknown;
  conflict?: unknown;
  /** The goblet effect the player kept: a conflict's old or new one, or 0 for a plain success. */
  confirmed?: number;
}

export interface CauldronBrew {
  /** The server and the time, unique per city. */
  id: string;
  at: number;
  worldId: string;
  /** Ingredient ids in the order they went into the cauldron. */
  ingredients: string[];
  spellFragments: number;
  /** Diamonds spent to boost the Spell Fragments. */
  premiumBoost: number;
  effects: CauldronEffectLevel[];
  /** The effects switched off, as the optimizer's indexes. */
  disabledEffects: number[];
  goblets: GobletResult[];
}

/** Enough brews for a few months of one a week. */
export const MAX_BREWS = 20;

export const effectLevels = (effects: PotionEffect[]): CauldronEffectLevel[] =>
  effects.map(({ id, state, level, boost, duration, nextBoost, nextDuration }) => ({
    id,
    state,
    level,
    boost,
    duration,
    nextBoost,
    nextDuration,
  }));

export const addBrew = (brews: CauldronBrew[] | undefined, brew: CauldronBrew) =>
  [...(brews ?? []), brew].slice(-MAX_BREWS);

/**
 * Adds a goblet's result to the brew. The server can send the same result again, after a reload
 * for one, so a result for a goblet already recorded replaces it, keeping the player's choice.
 */
export const addGobletResult = (brew: CauldronBrew, result: GobletResult) => {
  const recorded = brew.goblets.find((goblet) => goblet.gobletsLeft === result.gobletsLeft);
  if (recorded) {
    Object.assign(recorded, result, { confirmed: recorded.confirmed });
  } else {
    brew.goblets.push(result);
  }
};

/** The player confirmed the latest goblet's result, keeping the goblet effect `id`. */
export const confirmGoblet = (brew: CauldronBrew, id: number) => {
  const latest = brew.goblets.at(-1);
  if (latest) {
    latest.confirmed = id;
  }
};
