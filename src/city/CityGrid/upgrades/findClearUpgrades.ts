import { BuildingEx } from '../../../model/buildingEx';
import { InventoryItem } from '../../../model/inventoryItem';
import { StageProvision } from '../../../model/stageProvision';
import { CityBlock } from '../../CityBlock';

/** Production resources the upgrade finder reasons about, plus culture (a provision). */
export const UPGRADE_PRODUCTION_RESOURCES = ['mana', 'seeds', 'orcs', 'unurium', 'nox'];
export const UPGRADE_RESOURCE_ORDER = ['culture', ...UPGRADE_PRODUCTION_RESOURCES, 'population'];

const EPS = 1e-9;

export interface BuildingLookup {
  getBuilding(id: string, level: number): BuildingEx | undefined;
}

export interface UpgradeSuggestion {
  key: string;
  blockIds: number[];
  count: number;
  oldName: string;
  oldLevel: number;
  oldStage?: number;
  oldWidth: number;
  oldLength: number;
  /** Daily production (max across switchable options) plus culture/population provisions. */
  oldValues: Record<string, number>;
  /** Resources the old building produces that the finder does not consider (lost on replacement). */
  oldOther: string[];
  /** The old building only stands for a limited time. */
  oldIsExpiring: boolean;
  /** When the soonest-expiring block of the group runs out, if the game told us. */
  oldExpirationEnd?: number;
  itemId: number;
  itemAmount: number;
  newName: string;
  newLevel: number;
  newWidth: number;
  newLength: number;
  newValues: Record<string, number>;
  newOther: string[];
  currentItemStage?: number;
  /** Stage the comparison was made at (max reachable with owned artifacts). */
  targetStage?: number;
  artifactsNeeded?: number;
  artifactsOwned?: number;
}

export interface ClearUpgradesResult {
  suggestions: UpgradeSuggestion[];
  /** Resource columns that have at least one non-zero value, in display order. */
  resourceKeys: string[];
  /** Inventory evolving buildings skipped because artifact/stage data is missing. */
  skippedEvolvingItems: number;
}

interface ProductionProfile {
  /** One entry per selectable product for switchable buildings, a single merged entry otherwise. */
  options: Record<string, number>[];
  /** Per-resource daily max across options, plus culture/population provisions. */
  values: Record<string, number>;
  culture: number;
  population: number;
  area: number;
  otherProduction: string[];
  unknownStageData: boolean;
}

function buildProfile(building: BuildingEx, evolvingBuildings: StageProvision[], stage?: number): ProductionProfile {
  const source = building.sourceBuilding;
  const evolving = evolvingBuildings.find((eb) => eb.baseName === source.base_name);
  const stageEntry = stage !== undefined ? evolving?.stages.find((s) => s.id === stage) : undefined;
  const cultureFactor = stageEntry?.culture || 1;
  const populationFactor = stageEntry?.population || 1;

  let unknownStageData = false;
  const factorByIndex = new Map<number, number>();
  stageEntry?.products?.forEach((p) => {
    if (typeof p.index === 'number' && typeof p.factor === 'number') factorByIndex.set(p.index, p.factor);
    else unknownStageData = true;
  });

  const provisions = source.provisions?.resources?.resources;
  const culture = Math.floor(Math.max(provisions?.culture ?? 0, 0) * cultureFactor);
  const population = Math.floor(Math.max(provisions?.population ?? 0, 0) * populationFactor);

  const isSwitchable = source.production?.isSwitchable ?? false;
  const options: Record<string, number>[] = [];
  const merged: Record<string, number> = {};
  const otherProduction = new Set<string>();

  (source.production?.products ?? []).forEach((product, index) => {
    const pTime = product.production_time;
    if (!pTime || pTime <= 0) return;

    const dailyFactor = (86400 / pTime) * (factorByIndex.get(index) ?? 1);
    const option: Record<string, number> = {};

    Object.entries(product.revenue?.resources ?? {}).forEach(([res, amount]) => {
      if (!UPGRADE_PRODUCTION_RESOURCES.includes(res)) {
        otherProduction.add(res);
        return;
      }
      const daily = amount * dailyFactor;
      if (daily <= 0) return;
      if (isSwitchable) {
        option[res] = (option[res] || 0) + daily;
      } else if (daily > (merged[res] || 0)) {
        merged[res] = daily;
      }
    });

    if (isSwitchable && Object.keys(option).length > 0) options.push(option);
  });

  if (!isSwitchable) options.push(merged);
  if (options.length === 0) options.push({});

  const values: Record<string, number> = {};
  UPGRADE_PRODUCTION_RESOURCES.forEach((res) => {
    const max = options.reduce((acc, o) => Math.max(acc, o[res] || 0), 0);
    if (max > 0) values[res] = max;
  });
  if (culture > 0) values.culture = culture;
  if (population > 0) values.population = population;

  return {
    options,
    values,
    culture,
    population,
    area: building.width * building.length,
    otherProduction: Array.from(otherProduction).sort(),
    unknownStageData,
  };
}

/**
 * Set buildings are flagged by a component in the catalog, which older stored data
 * predates, so their dedicated connection strategy stands in until it is refreshed.
 */
function isSetBuilding(building: BuildingEx): boolean {
  return building.sourceBuilding.isSetBuilding === true || building.connectionStrategy === 'set_buildings';
}

function hasConsideredOutput(profile: ProductionProfile): boolean {
  return profile.culture > 0 || UPGRADE_PRODUCTION_RESOURCES.some((res) => (profile.values[res] || 0) > 0);
}

/**
 * True when the replacement is a "clear upgrade": every product option the old building
 * offers is covered (simultaneously or as a switchable option), culture and population are
 * not reduced, no considered resource gets less efficient per square, and at least one
 * considered resource gets strictly more efficient per square.
 */
function dominates(candidate: ProductionProfile, existing: ProductionProfile): boolean {
  const covered = existing.options.every((oldOption) =>
    candidate.options.some((newOption) =>
      UPGRADE_PRODUCTION_RESOURCES.every((res) => (newOption[res] || 0) + EPS >= (oldOption[res] || 0)),
    ),
  );
  if (!covered) return false;

  if (candidate.culture < existing.culture) return false;
  if (candidate.population < existing.population) return false;

  const considered = [...UPGRADE_PRODUCTION_RESOURCES, 'culture'];
  for (const res of considered) {
    const oldPerSquare = (existing.values[res] || 0) / existing.area;
    if (oldPerSquare > 0 && (candidate.values[res] || 0) / candidate.area + EPS < oldPerSquare) return false;
  }

  return considered.some(
    (res) => (candidate.values[res] || 0) / candidate.area > (existing.values[res] || 0) / existing.area + EPS,
  );
}

interface EvolutionPlan {
  isEvolving: boolean;
  missingData?: boolean;
  currentStage?: number;
  targetStage?: number;
  artifactsOwned?: number;
  artifactsNeeded?: number;
}

function getEvolutionPlan(
  item: InventoryItem,
  building: BuildingEx,
  evolvingBuildings: StageProvision[],
  inventory: InventoryItem[],
): EvolutionPlan {
  const evolving = evolvingBuildings.find((eb) => eb.baseName === building.sourceBuilding.base_name);
  if (!evolving) return { isEvolving: false };
  if (!evolving.artifactId) return { isEvolving: true, missingData: true };

  const artifactId = evolving.artifactId.toUpperCase();
  const artifactsOwned = inventory
    .filter((i) => i.subtype?.toUpperCase() === artifactId)
    .reduce((sum, i) => sum + i.amount, 0);
  const artifactCost = evolving.artifactCost || 1;
  const maxStage = building.maxStage || evolving.stages.reduce((max, s) => Math.max(max, s.id), 0) || 1;
  const currentStage = item.stage || 1;
  const targetStage = Math.min(maxStage, currentStage + Math.floor(artifactsOwned / artifactCost));

  return {
    isEvolving: true,
    currentStage,
    targetStage,
    artifactsOwned,
    artifactsNeeded: (targetStage - currentStage) * artifactCost,
  };
}

export function findClearUpgrades(
  blocks: CityBlock[],
  finder: BuildingLookup,
  evolvingBuildings: StageProvision[],
  inventory: InventoryItem[],
): ClearUpgradesResult {
  let skippedEvolvingItems = 0;

  // Inventory candidates: placeable buildings that are clear-upgrade material.
  interface Candidate {
    item: InventoryItem;
    building: BuildingEx;
    profile: ProductionProfile;
    plan: EvolutionPlan;
  }
  const candidates: Candidate[] = [];
  for (const item of inventory) {
    const building = item.building;
    if (!building || item.amount <= 0) continue;
    // Buildable buildings (streets, residences, workshops, armories, manufactories) are excluded.
    if (/^[SRPOG]_/.test(building.sourceBuilding.base_name)) continue;
    if (building.expiration !== undefined || building.type === 'expiring') continue;
    const requirements = building.sourceBuilding.requirements?.resources;
    if ((requirements?.population ?? 0) > 0 || (requirements?.culture ?? 0) > 0) continue;

    const plan = getEvolutionPlan(item, building, evolvingBuildings, inventory);
    if (plan.missingData) {
      skippedEvolvingItems++;
      continue;
    }

    const profile = buildProfile(building, evolvingBuildings, plan.targetStage ?? item.stage);
    if (profile.unknownStageData) {
      skippedEvolvingItems++;
      continue;
    }
    if (!hasConsideredOutput(profile)) continue;

    candidates.push({ item, building, profile, plan });
  }

  // Group identical city buildings so ten unicorns make one row, not ten.
  interface Group {
    members: { id: number; expirationEnd?: number }[];
    gameId: string;
    level: number;
    stage?: number;
    name: string;
  }
  const groups = new Map<string, Group>();
  for (const block of blocks) {
    // Same exclusions as the table view: streets, residences, workshops, armories, wonders.
    if (/^[SRPO]_/.test(block.gameId)) continue;
    if (block.entity.type === 'ancient_wonder') continue;

    const key = `${block.gameId}|${block.level}|${block.stage ?? ''}`;
    const member = { id: block.id, expirationEnd: block.expirationEnd };
    const group = groups.get(key);
    if (group) {
      group.members.push(member);
    } else {
      groups.set(key, {
        members: [member],
        gameId: block.gameId,
        level: block.level,
        stage: block.stage,
        name: block.name,
      });
    }
  }

  const suggestions: UpgradeSuggestion[] = [];
  for (const [key, group] of groups) {
    const building = finder.getBuilding(group.gameId, group.level);
    if (!building) continue;

    // Evolving city buildings are never candidates for replacement.
    if (building.maxStage || evolvingBuildings.some((eb) => eb.baseName === building.sourceBuilding.base_name)) {
      continue;
    }

    // Nor are set buildings: their output depends on what they touch, and removing one
    // also costs the set bonus of every neighbour.
    if (isSetBuilding(building)) continue;

    const profile = buildProfile(building, evolvingBuildings, group.stage);
    if (!hasConsideredOutput(profile)) continue;

    const oldIsThin = building.width === 1 || building.length === 1;

    // Replacing the copy that runs out first is the natural choice, so it leads the list
    // and its deadline is the one reported.
    const members = [...group.members].sort(
      (a, b) => (a.expirationEnd ?? Number.POSITIVE_INFINITY) - (b.expirationEnd ?? Number.POSITIVE_INFINITY),
    );
    const blockIds = members.map((m) => m.id);
    const oldExpirationEnd = members[0].expirationEnd;
    const oldIsExpiring =
      oldExpirationEnd !== undefined || building.expiration !== undefined || building.type === 'expiring';

    for (const candidate of candidates) {
      // A 1xN building collects less neighbourly help, so it never replaces a
      // building that is at least two tiles on both sides.
      if (!oldIsThin && (candidate.building.width === 1 || candidate.building.length === 1)) continue;

      if (!dominates(candidate.profile, profile)) continue;

      suggestions.push({
        key: `${key}->${candidate.item.id}`,
        blockIds,
        count: blockIds.length,
        oldName: building.name || group.name,
        oldLevel: group.level,
        oldStage: group.stage,
        oldWidth: building.width,
        oldLength: building.length,
        oldValues: profile.values,
        oldOther: profile.otherProduction,
        oldIsExpiring,
        oldExpirationEnd,
        itemId: candidate.item.id,
        itemAmount: candidate.item.amount,
        newName: candidate.building.name,
        newLevel: candidate.building.sourceBuilding.level || 1,
        newWidth: candidate.building.width,
        newLength: candidate.building.length,
        newValues: candidate.profile.values,
        newOther: candidate.profile.otherProduction,
        currentItemStage: candidate.plan.currentStage,
        targetStage: candidate.plan.targetStage,
        artifactsNeeded: candidate.plan.artifactsNeeded,
        artifactsOwned: candidate.plan.artifactsOwned,
      });
    }
  }

  suggestions.sort((a, b) => a.oldName.localeCompare(b.oldName) || a.newName.localeCompare(b.newName));

  const usedKeys = new Set<string>();
  for (const suggestion of suggestions) {
    Object.entries(suggestion.oldValues).forEach(([k, v]) => v > 0 && usedKeys.add(k));
    Object.entries(suggestion.newValues).forEach(([k, v]) => v > 0 && usedKeys.add(k));
  }
  const resourceKeys = UPGRADE_RESOURCE_ORDER.filter((k) => usedKeys.has(k));

  return { suggestions, resourceKeys, skippedEvolvingItems };
}
