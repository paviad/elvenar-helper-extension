import { EnsorcelledEndowment } from '../model/ensorcelledEndowment';
import { InventoryItem } from '../model/inventoryItem';
import { UnlockedArea } from '../model/unlockedArea';
import { CityBlock } from './CityBlock';

export const EXPORT_SCHEMA_VERSION = 2;

export interface ExportedEntity {
  id: number;
  cityentity_id: string;
  x: number;
  y: number;
  stage?: number;
  type: string;
  level: number;
  expires_at?: number;
  enchanted_until?: number;
  helped_until?: number;
}

export interface CityExport {
  schema_version: number;
  exported_at: number;
  city_map: {
    unlocked_areas: UnlockedArea[];
    entities: ExportedEntity[];
  };
  user_data: { race: string };
  resources?: Record<string, number>;
  inventory?: {
    time_boosters?: Record<string, number>;
    generous_guests?: number;
    portal_profits?: number;
  };
  progress?: {
    wisdom_of_life_earned?: number;
    wisdoms_produced?: number;
  };
}

/** `INS_TR_AMT_<minutes>` inventory rows are time boosters worth that many minutes. */
const TIME_BOOSTER_PREFIX = 'INS_TR_AMT_';

/** `INS_RF_GRR_<percent>` inventory rows are Portal Profits worth that share of a production. */
const PORTAL_PROFIT_PREFIX = 'INS_RF_GRR_';

/** Generous Guests, the settlement production enchantment, is stocked in the resource bag. */
const GENEROUS_GUESTS_KEY = 'spell_settlement_production_boost_1';

/** The Wisdoms that `wisdoms_produced` totals up. */
const WISDOM_KEYS = ['ch25_wisdom_kid', 'ch25_wisdom_adult', 'ch25_wisdom_elder'];

/**
 * The game drops a resource key entirely once you hold none of it, and the consumer treats a
 * present key as authoritative, so an absent key is left out rather than exported as a zero.
 */
function readResource(resources: Record<string, number>, key: string): number | undefined {
  const value = resources[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sumResources(resources: Record<string, number>, keys: string[]): number | undefined {
  const values = keys.map((key) => readResource(resources, key)).filter((value) => value !== undefined);
  return values.length > 0 ? values.reduce((acc, value) => acc + value, 0) : undefined;
}

/** In spec order, so the exported object reads the way the format documents it. */
const RESOURCE_FIELDS: [string, (resources: Record<string, number>) => number | undefined][] = [
  ['nox', (r) => readResource(r, 'nox')],
  ['eldian_sapphires', (r) => readResource(r, 'eldian_sapphire')],
  // `prosperity` is what is left unspent; `required_prosperity` is what the city has committed.
  ['prosperity_available', (r) => readResource(r, 'prosperity')],
  ['prosperity_total', (r) => sumResources(r, ['prosperity', 'required_prosperity'])],
  ['wisdom_of_life', (r) => readResource(r, 'ch25_wisdom_life')],
  ['wisdom_of_youth', (r) => readResource(r, 'ch25_wisdom_kid')],
  ['wisdom_of_adults', (r) => readResource(r, 'ch25_wisdom_adult')],
  ['wisdom_of_age', (r) => readResource(r, 'ch25_wisdom_elder')],
];

function toEpochSeconds(milliseconds: number | undefined): number | undefined {
  return typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds > 0
    ? Math.floor(milliseconds / 1000)
    : undefined;
}

function buildResources(resources: Record<string, number>): Record<string, number> | undefined {
  const block: Record<string, number> = {};
  for (const [field, read] of RESOURCE_FIELDS) {
    const value = read(resources);
    if (value !== undefined) {
      block[field] = value;
    }
  }
  return Object.keys(block).length > 0 ? block : undefined;
}

/** Both booster families are one id per size, with the size spelled out in the suffix. */
function readSizedItems(inventoryItems: InventoryItem[], prefix: string): { size: number; amount: number }[] {
  return inventoryItems
    .filter((item) => item.subtype?.startsWith(prefix))
    .map((item) => ({ size: Number(item.subtype.slice(prefix.length)), amount: item.amount }))
    .filter((row) => Number.isFinite(row.size) && row.size > 0 && Number.isFinite(row.amount));
}

/** Keyed by duration in hours as a decimal string, valued by how many are held. */
function buildTimeBoosters(inventoryItems: InventoryItem[]): Record<string, number> | undefined {
  const boosters: Record<string, number> = {};
  for (const { size, amount } of readSizedItems(inventoryItems, TIME_BOOSTER_PREFIX)) {
    const hours = String(Number((size / 60).toFixed(4)));
    boosters[hours] = (boosters[hours] || 0) + amount;
  }
  return Object.keys(boosters).length > 0 ? boosters : undefined;
}

/**
 * Each row is worth its suffix as a percentage of a portal production, so the sizes collapse
 * into how many whole productions the player is holding rather than a raw headcount.
 */
function buildPortalProfits(inventoryItems: InventoryItem[]): number | undefined {
  const rows = readSizedItems(inventoryItems, PORTAL_PROFIT_PREFIX);
  if (rows.length === 0) {
    return undefined;
  }
  return Math.round(rows.reduce((acc, row) => acc + row.amount * row.size, 0) / 100);
}

function buildInventory(
  resources: Record<string, number>,
  inventoryItems: InventoryItem[],
): CityExport['inventory'] | undefined {
  const block: NonNullable<CityExport['inventory']> = {};
  const timeBoosters = buildTimeBoosters(inventoryItems);
  if (timeBoosters) {
    block.time_boosters = timeBoosters;
  }
  const generousGuests = readResource(resources, GENEROUS_GUESTS_KEY);
  if (generousGuests !== undefined) {
    block.generous_guests = generousGuests;
  }
  const portalProfits = buildPortalProfits(inventoryItems);
  if (portalProfits !== undefined) {
    block.portal_profits = portalProfits;
  }
  return Object.keys(block).length > 0 ? block : undefined;
}

function buildProgress(resources: Record<string, number>): CityExport['progress'] | undefined {
  const block: NonNullable<CityExport['progress']> = {};
  const wisdomOfLifeEarned = readResource(resources, 'ch25_wisdom_life');
  if (wisdomOfLifeEarned !== undefined) {
    block.wisdom_of_life_earned = wisdomOfLifeEarned;
  }
  const wisdomsProduced = sumResources(resources, WISDOM_KEYS);
  if (wisdomsProduced !== undefined) {
    block.wisdoms_produced = wisdomsProduced;
  }
  return Object.keys(block).length > 0 ? block : undefined;
}

/** Keyed by entity id, the way the EE tab looks help up. */
export function toHelpEnd(neighborlyHelpEffects: EnsorcelledEndowment[] | undefined): Record<string, number> {
  return Object.fromEntries((neighborlyHelpEffects || []).map((effect) => [String(effect.id), effect.endTime]));
}

/**
 * Entity ids are renumbered from 1, so the expiry, enchantment and help end times have to be read
 * off the block while the real game id is still in reach.
 */
export function buildExportEntities(
  blocks: CityBlock[],
  enchantmentsEnd: Record<string, number>,
  helpEnd: Record<string, number>,
): ExportedEntity[] {
  return blocks.map((block, idx) => ({
    id: idx + 1,
    cityentity_id: block.entity.cityentity_id,
    x: block.x,
    y: block.y,
    stage: block.entity.stage,
    type: block.type.replace(/_[xy]$/, ''),
    level: block.entity.level,
    expires_at: toEpochSeconds(block.expirationEnd),
    enchanted_until: toEpochSeconds(enchantmentsEnd[String(block.entity.id)]),
    helped_until: toEpochSeconds(helpEnd[String(block.entity.id)]),
  }));
}

export function buildCityExport({
  blocks,
  unlockedAreas,
  race,
  resources,
  inventoryItems,
  enchantmentsEnd,
  helpEnd,
  now,
}: {
  blocks: CityBlock[];
  unlockedAreas: UnlockedArea[];
  race: string;
  resources: Record<string, number>;
  inventoryItems: InventoryItem[];
  enchantmentsEnd: Record<string, number>;
  helpEnd: Record<string, number>;
  now: number;
}): CityExport {
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    exported_at: Math.floor(now / 1000),
    city_map: {
      unlocked_areas: unlockedAreas,
      entities: buildExportEntities(blocks, enchantmentsEnd, helpEnd),
    },
    user_data: { race },
    resources: buildResources(resources),
    inventory: buildInventory(resources, inventoryItems),
    progress: buildProgress(resources),
  };
}
