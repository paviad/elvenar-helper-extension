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
