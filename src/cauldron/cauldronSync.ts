import { Ingredient } from '../model/ingredient';

/**
 * What the extension tells the Cauldron Optimizer site when the player opens the cauldron in the
 * game. The site keeps one "world" of settings per name, so each game city gets a world of its
 * own there, named by {@link cauldronWorldName}, and the player's own worlds are never touched.
 */
export interface CauldronSync {
  worldName: string;
  /** The `researchtree_diplomas` resource: one effect unlocked per diploma, in the site's order. */
  diplomas?: number;
  /** This week's premium ingredients as the site's indexes (0-11); unknown during the cooldown. */
  premiumIngredients?: number[];
  /** Unlocked effects the player has switched on, as the site's indexes (0 to diplomas - 1). */
  selectedEffects?: number[];
  /** Level of the wonder that cuts ingredient costs (0-35, 0 while it is not built). */
  wonderLevel?: number;
  /** Witch Points the player has, the most a recipe may cost. */
  witchPoints?: number;
}

export const CAULDRON_SITE_ORIGIN = 'https://cauldron-optimizer.vercel.app';

/** The site's world name input takes at most this many characters. */
const MAX_WORLD_NAME = 24;

/**
 * `EA-<player>-<server>`, e.g. `EA-Balrogville-en3`. A long player name is cut so the whole fits
 * the site's limit; the prefix and server stay, since they are what tell our worlds apart. Runs of
 * whitespace are collapsed the way the site does when it saves a name, so ours reads back equal.
 */
export const cauldronWorldName = (userName: string, worldId: string) => {
  const prefix = 'EA-';
  const suffix = `-${worldId}`;
  const player = userName.trim().replace(/\s+/g, ' ');
  return prefix + player.slice(0, MAX_WORLD_NAME - prefix.length - suffix.length).trim() + suffix;
};

/**
 * The game names the ingredients `cauldron_ingredient1` to `cauldron_ingredient12`; the site
 * numbers the same twelve 0-11 in that order. Checked against the site's own effect tables, which
 * agree with the game's potion effects ingredient for ingredient.
 */
export const ingredientIndex = (id: string): number | undefined => {
  const match = /^cauldron_ingredient(\d+)$/.exec(id);
  const index = match ? Number(match[1]) - 1 : -1;
  return index >= 0 && index < 12 ? index : undefined;
};

export const premiumIngredientIndexes = (ingredients: Ingredient[]) =>
  ingredients
    .filter((ingredient) => ingredient.isPremium)
    .map((ingredient) => ingredientIndex(ingredient.id))
    .filter((index): index is number => index !== undefined)
    .sort((a, b) => a - b);

/**
 * The game numbers the potion effects `pe_301` onwards in the order diplomas unlock them, the order
 * the site lists them in, so `pe_301` (Coins) is the site's effect 0.
 */
export const effectIndex = (id: string): number | undefined => {
  const match = /^pe_(\d+)$/.exec(id);
  const index = match ? Number(match[1]) - 301 : -1;
  return index >= 0 ? index : undefined;
};

/**
 * The effects switched off, as sorted site indexes. The game leaves `enabled` out of an effect
 * switched off rather than sending false, so anything but true is off.
 */
export const disabledEffectIndexes = (effects: { id: string; enabled?: boolean }[]) =>
  effects
    .filter((effect) => effect.enabled !== true)
    .map((effect) => effectIndex(effect.id))
    .filter((index): index is number => index !== undefined)
    .sort((a, b) => a - b);

/**
 * The unlocked effects left on. The site only takes indexes below the diploma count, and the game
 * also reports effects not unlocked yet as on, so those are left out.
 */
export const selectedEffectIndexes = (diplomas: number, disabled: number[]) =>
  Array.from({ length: diplomas }, (_, index) => index).filter((index) => !disabled.includes(index));
