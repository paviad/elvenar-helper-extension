import { TrainingBuilding, TroopType } from '../model/armyDetails';
import { AttackDefenseBonus, BattleUnitType } from '../model/battleUnitType';
import { Army } from '../model/tourny/provinceInformation';

/** The five squad slots the game gives you for a tournament encounter. */
export const SQUAD_SLOTS = 5;

const TRAINING_BUILDINGS: TrainingBuilding[] = ['hb', 'eb', 'mc', 'tg'];
const TROOP_TYPES: TroopType[] = ['hm', 'hr', 'lm', 'lr', 'ma'];

/** Short troop codes to the descriptive keys the almanac uses in `strengths`. */
const TROOP_TYPE_MAP: Record<TroopType, keyof AttackDefenseBonus> = {
  lm: 'light_melee',
  lr: 'light_ranged',
  ma: 'mage',
  hm: 'heavy_melee',
  hr: 'heavy_ranged',
};

export type CounterQuality = 'Optimal' | 'Strong' | 'Decent' | 'Meh' | 'Experimental';

export interface ParsedUnitId {
  building: TrainingBuilding;
  troopType: TroopType;
}

export interface CompositionSlot {
  unit: BattleUnitType;
  troopType: TroopType;
  building: TrainingBuilding;
  /** How many of the five squad slots this unit fills. */
  squads: number;
  /** Units in one squad — `floor(playerSquadSize / unitWeight)`, as the game sizes them. */
  sizePerSquad: number;
  /** What fielding this part of the composition costs you in total. */
  totalUnits: number;
  /** Indices into the enemy army that this unit was picked to answer. */
  answers: number[];
}

export interface CounterComposition {
  slots: CompositionSlot[];
  /** Enemies met by a unit that has swords against them, out of five. */
  coverage: number;
  /** Enemies that have swords back against the unit facing them. */
  exposed: number;
  score: number;
  quality: CounterQuality;
}

/**
 * Both id shapes carry the same two codes: `hb_lr_4` splits on underscores, while the enemy form
 * `mob_hblr_5` runs them together in one segment.
 */
export const parseUnitId = (unitId: string): ParsedUnitId | null => {
  const parts = unitId.toLowerCase().split('_');
  const [building, troopType] =
    parts[0] === 'mob' ? [parts[1]?.slice(0, 2), parts[1]?.slice(2, 4)] : [parts[0], parts[1]];

  if (!TRAINING_BUILDINGS.includes(building as TrainingBuilding)) return null;
  if (!TROOP_TYPES.includes(troopType as TroopType)) return null;

  return { building: building as TrainingBuilding, troopType: troopType as TroopType };
};

/** How many swords `attacker` brings against a unit of `targetTroopType`. */
const strengthAgainst = (attacker: BattleUnitType | undefined, targetTroopType: TroopType): number =>
  attacker?.strengths?.[TROOP_TYPE_MAP[targetTroopType]] || 0;

/** Heavy ranged out of the barracks or mercenary camp reaches the whole map. */
const hasFullMapRange = ({ building, troopType }: ParsedUnitId): boolean =>
  troopType === 'hr' && building !== 'tg';

const isRanged = ({ troopType }: ParsedUnitId): boolean => troopType === 'lr' || troopType === 'hr';

/**
 * Graded on net swords per slot rather than on coverage: filling every slot with its own best
 * answer nearly always covers all five enemies, so coverage alone would read "Optimal" even for a
 * composition scraped together out of whatever was left in stock. Three is the most a unit can
 * bring against the class it is built to beat.
 */
const qualityFor = (score: number, slotCount: number): CounterQuality => {
  const netPerSlot = score / slotCount;
  if (netPerSlot >= 2.5) return 'Optimal';
  if (netPerSlot >= 1.5) return 'Strong';
  if (netPerSlot >= 0.8) return 'Decent';
  if (netPerSlot > 0) return 'Meh';
  return 'Experimental';
};

interface Candidate {
  unit: BattleUnitType;
  parsed: ParsedUnitId;
  sizePerSquad: number;
}

interface RankedPick {
  candidate: Candidate;
  /** Our swords against this enemy, minus its swords back at us. */
  score: number;
}

/**
 * Ranks every candidate against one enemy. The tie-breaks match the order players use when two
 * units counter equally well: reach first, then full map range, then the id so the pick is stable.
 */
const rankAgainst = (candidates: Candidate[], enemy: BattleUnitType | undefined, enemyTroopType: TroopType) =>
  candidates
    .map<RankedPick>((candidate) => ({
      candidate,
      score:
        strengthAgainst(candidate.unit, enemyTroopType) - strengthAgainst(enemy, candidate.parsed.troopType),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aRanged = isRanged(a.candidate.parsed);
      const bRanged = isRanged(b.candidate.parsed);
      if (aRanged !== bRanged) return aRanged ? -1 : 1;

      const aFullRange = hasFullMapRange(a.candidate.parsed);
      const bFullRange = hasFullMapRange(b.candidate.parsed);
      if (aFullRange !== bFullRange) return aFullRange ? -1 : 1;

      return a.candidate.unit.unitTypeId.localeCompare(b.candidate.unit.unitTypeId);
    });

/**
 * Builds the squad composition to field against one encounter.
 *
 * Each of the five slots is filled independently — the game accepts five different unit types,
 * each sized by its own weight — so the best composition is simply the best answer to each enemy
 * in turn. Enemies of the same type collapse onto the same answer, which is what turns the result
 * into a blend like "3 Frog Prince + 2 Blossom Princess" rather than five unrelated units.
 *
 * @param enemyArmy the units this encounter fields.
 * @param roster the player's available units, already narrowed to those present in the almanac.
 * @param almanac every unit, needed to look up what the *enemy* is strong against.
 * @param playerSquadSize from the province information; sizes each slot.
 * @param unitStock owned units per type. When given, the composition will not ask for more of a
 *   unit than the player has, falling back to the next-best answer for the slots it cannot fill.
 */
export function calculateCounterComposition(
  enemyArmy: Army[],
  roster: BattleUnitType[],
  almanac: BattleUnitType[],
  playerSquadSize: number,
  unitStock?: Record<string, number>,
): CounterComposition | null {
  if (!enemyArmy?.length || !roster.length || !almanac?.length || playerSquadSize <= 0) {
    return null;
  }

  const almanacMap = new Map(almanac.map((u) => [u.unitTypeId, u]));

  const candidates = roster.reduce<Candidate[]>((acc, unit) => {
    const parsed = parseUnitId(unit.unitTypeId);
    const sizePerSquad = unit.unitWeight > 0 ? Math.floor(playerSquadSize / unit.unitWeight) : 0;
    if (parsed && sizePerSquad > 0) {
      acc.push({ unit, parsed, sizePerSquad });
    }
    return acc;
  }, []);

  if (!candidates.length) {
    return null;
  }

  const enemies = enemyArmy.map((enemy) => ({
    stats: almanacMap.get(enemy.unitTypeId),
    parsed: parseUnitId(enemy.unitTypeId),
  }));

  const rankings = enemies.map(({ stats, parsed }) =>
    // An unrecognised enemy still occupies a slot, so it is ranked on defence alone.
    parsed ? rankAgainst(candidates, stats, parsed.troopType) : rankAgainst(candidates, stats, 'lm'),
  );

  // Slots where the best answer beats the runner-up by the most are filled first, so when stock
  // is tight it is spent where the choice actually matters.
  const order = rankings
    .map((ranked, index) => ({ index, regret: (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0) }))
    .sort((a, b) => b.regret - a.regret || a.index - b.index)
    .map((entry) => entry.index);

  const remainingStock = unitStock ? { ...unitStock } : undefined;
  const picks: RankedPick[] = [];

  for (const enemyIndex of order) {
    const ranked = rankings[enemyIndex];
    let chosen = ranked[0];

    if (remainingStock) {
      // With nothing affordable anywhere, the ideal answer is kept rather than naming a unit that
      // is no better and equally absent.
      chosen =
        ranked.find(
          (entry) => (remainingStock[entry.candidate.unit.unitTypeId] ?? 0) >= entry.candidate.sizePerSquad,
        ) ?? ranked[0];

      const stockKey = chosen.candidate.unit.unitTypeId;
      remainingStock[stockKey] = (remainingStock[stockKey] ?? 0) - chosen.candidate.sizePerSquad;
    }

    picks[enemyIndex] = chosen;
  }

  const slotsByUnit = new Map<string, CompositionSlot>();
  let coverage = 0;
  let exposed = 0;
  let score = 0;

  picks.forEach((pick, enemyIndex) => {
    const { candidate } = pick;
    const enemy = enemies[enemyIndex];

    score += pick.score;
    if (enemy.parsed && strengthAgainst(candidate.unit, enemy.parsed.troopType) > 0) coverage++;
    if (strengthAgainst(enemy.stats, candidate.parsed.troopType) > 0) exposed++;

    const existing = slotsByUnit.get(candidate.unit.unitTypeId);
    if (existing) {
      existing.squads++;
      existing.totalUnits += candidate.sizePerSquad;
      existing.answers.push(enemyIndex);
      return;
    }

    slotsByUnit.set(candidate.unit.unitTypeId, {
      unit: candidate.unit,
      troopType: candidate.parsed.troopType,
      building: candidate.parsed.building,
      squads: 1,
      sizePerSquad: candidate.sizePerSquad,
      totalUnits: candidate.sizePerSquad,
      answers: [enemyIndex],
    });
  });

  const slots = [...slotsByUnit.values()].sort(
    (a, b) => b.squads - a.squads || a.unit.unitTypeId.localeCompare(b.unit.unitTypeId),
  );

  return {
    slots,
    coverage,
    exposed,
    score,
    quality: qualityFor(score, enemyArmy.length),
  };
}
