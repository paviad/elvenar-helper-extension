import { CultureHelpState, CultureModifiers } from '../model/cultureBonus';
import { Effect } from '../model/effect';
import { StageProvision } from '../model/stageProvision';
import { BuildingFinder } from './buildingFinder';
import { CityBlock } from './CityBlock';
import { isOutOfGrid } from './isOutOfGrid';
import { canReceiveNeighbourlyHelp } from './neighbourlyHelp';

/** The kinds of building neighbourly help polishes for culture. */
const HELPABLE_TYPES = ['culture', 'culture_residential'];
/** What one Ensorcelled Endowment on a helped building adds to the culture bonus, in percent. */
const ENCHANTMENT_PERCENT = 5;
const ENCHANTMENT_SPELL = 'spell_neighborly_help_boost_1';

export interface CultureHelp {
  /** Culture buildings in the city that neighbourly help can polish. */
  helpable: number;
  helped: number;
  enchanted: number;
  /** Culture the helps add, counted towards the bonus thresholds. */
  neighbourlyHelpBonus: number;
  /** Percentage the enchantments add to every bonus level above the first. */
  spellFactor: number;
}

const clampShare = (share: number) => Math.min(Math.max(share, 0), 1);

/** The sum of an effect's value over every building in the city that carries it. */
function effectTotal(effect: Effect, blocks: CityBlock[]): number {
  let total = 0;
  for (const block of blocks) {
    if (isOutOfGrid(block)) continue;
    if (effect.origins?.some((origin) => block.gameId.startsWith(origin))) {
      total += effect.values?.[block.level] ?? 0;
    }
  }
  return total;
}

/**
 * The buildings in the city that neighbourly help can polish for culture, with the culture each
 * gives: culture buildings on the grid at least two tiles on both sides.
 */
function helpableBuildings(blocks: CityBlock[], buildingFinder: BuildingFinder, evolvingBuildings: StageProvision[]) {
  const helpable: { block: CityBlock; culture: number }[] = [];
  for (const block of blocks) {
    if (isOutOfGrid(block) || !canReceiveNeighbourlyHelp(block)) continue;
    const source = buildingFinder.getBuilding(block.gameId, block.level)?.sourceBuilding;
    if (!source || !HELPABLE_TYPES.includes(source.type)) continue;
    const stage = evolvingBuildings
      .find((eb) => eb.baseName === source.base_name)
      ?.stages.find((s) => s.id === block.stage);
    const culture = Math.floor((source.provisions?.resources?.resources?.culture || 0) * (stage?.culture || 1));
    if (culture > 0) helpable.push({ block, culture });
  }
  return helpable;
}

/**
 * How much of a played city is helped and enchanted, as shares a plan can be given: the helped
 * share of the buildings help can reach, and the enchanted share of the helped ones. An
 * enchantment on a building nobody helped does nothing in the game, so it is not counted.
 */
export function cultureModifiersFromState(
  blocks: CityBlock[],
  buildingFinder: BuildingFinder,
  evolvingBuildings: StageProvision[],
  state: CultureHelpState,
): CultureModifiers {
  const helpedIds = new Set(state.helped);
  const enchantedIds = new Set(state.enchanted);
  const helpable = helpableBuildings(blocks, buildingFinder, evolvingBuildings);
  const helped = helpable.filter(({ block }) => helpedIds.has(String(block.entity.id)));
  const enchanted = helped.filter(({ block }) => enchantedIds.has(String(block.entity.id)));
  return {
    help: helpable.length ? helped.length / helpable.length : 0,
    enchant: helped.length ? enchanted.length / helped.length : 0,
  };
}

/**
 * The neighbourly help and enchantments a city gets with these modifiers. Help goes to the
 * biggest culture buildings first, since neighbours' help picks the best building there is,
 * and doubles their culture, or more with the Neighborly Help Bonus wonder. Each helped
 * building enchanted adds 5% to the bonus, more with the wonders and buildings that raise the
 * spell's power. Checked against the game's own numbers at chapter 5 and 25.
 */
export function calculateCultureHelp(
  blocks: CityBlock[],
  buildingFinder: BuildingFinder,
  evolvingBuildings: StageProvision[],
  effects: Effect[],
  modifiers: CultureModifiers,
): CultureHelp {
  const cultures = helpableBuildings(blocks, buildingFinder, evolvingBuildings).map(({ culture }) => culture);
  cultures.sort((a, b) => b - a);

  const helped = Math.round(clampShare(modifiers.help) * cultures.length);
  const enchanted = Math.round(clampShare(modifiers.enchant) * helped);

  // The wonder's value is the whole factor the help multiplies by, so without it help doubles.
  const helpFactor =
    effects.filter((e) => e.action === 'higher_culture_boost').reduce((sum, e) => sum + effectTotal(e, blocks), 0) || 1;
  const spellPower = effects
    .filter((e) => e.action === 'increase_spell_power_boost' && e.targets?.includes(ENCHANTMENT_SPELL))
    .reduce((sum, e) => sum + effectTotal(e, blocks), 0);

  const helpedCulture = cultures.slice(0, helped).reduce((sum, culture) => sum + culture, 0);
  return {
    helpable: cultures.length,
    helped,
    enchanted,
    neighbourlyHelpBonus: Math.round(helpedCulture * helpFactor),
    spellFactor: Math.round(enchanted * ENCHANTMENT_PERCENT * (1 + spellPower)),
  };
}
