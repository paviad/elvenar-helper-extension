import { AttackDefenseBonus, BattleUnitType } from '../model/battleUnitType';
import { Army } from '../model/tourny/provinceInformation';

/**
 * Maps short troop type codes (lm, lr, etc.) to the descriptive keys
 * used in the BattleUnitType 'strengths' and 'attackBonus' objects.
 */
const TROOP_TYPE_MAP: Record<string, keyof AttackDefenseBonus> = {
  lm: 'light_melee',
  lr: 'light_ranged',
  ma: 'mage',
  hm: 'heavy_melee',
  hr: 'heavy_ranged',
};

export type CounterQuality = 'Optimal' | 'Strong' | 'Decent' | 'Meh' | 'Experimental';

export interface CounterResult {
  unit: BattleUnitType;
  quality: CounterQuality;
  score: number; // Sum of strength index values
  counterCount: number; // Number of enemies (out of 5) countered (strength > 0)
}

/**
 * Extracts the TroopType (lm, lr, ma, hm, hr) from a technical UnitID string.
 */
const getTroopType = (unitId: string): string | null => {
  const lower = unitId.toLowerCase();
  const match = lower.match(/(hm|hr|lm|lr|ma)/);
  return match ? match[0] : null;
};

/**
 * Checks if the unit is a Heavy Ranged unit with full map range (HB, EB, MC).
 */
const hasFullMapRange = (unitId: string): boolean => {
  const lower = unitId.toLowerCase();
  return lower.includes('hr') && (lower.includes('hb') || lower.includes('eb') || lower.includes('mc'));
};

/**
 * Determines the strength value of an attacker against a specific target type
 * using the almanac's strength index.
 */
const getStrengthValue = (attacker: BattleUnitType, targetId: string): number => {
  const targetClass = getTroopType(targetId);
  if (!targetClass) return 0;

  const strengthKey = TROOP_TYPE_MAP[targetClass];
  return attacker.strengths[strengthKey] || 0;
};

/**
 * Calculates the best counter composition (5 units of the same type) for a target army.
 * * @param targetArmy - The 5 enemy units in the wave.
 * @param roster - The collection of 15 available friendly units to choose from.
 * @param almanac - The complete database of units used for looking up enemy stats (penalties).
 */
export function calculateBestCounter(
  targetArmy: Army[],
  roster: BattleUnitType[],
  almanac: BattleUnitType[],
): CounterResult | null {
  if (!targetArmy || targetArmy.length === 0 || roster.length === 0 || !almanac) return null;

  // Create a map for fast lookup of any unit stats within the complete almanac
  const almanacMap = new Map(almanac.map((u) => [u.unitTypeId, u]));

  const results: CounterResult[] = roster.map((friendlyUnit) => {
    let totalScore = 0;
    let counterCount = 0;

    targetArmy.forEach((enemy) => {
      // 1. Calculate our offensive strength index against the enemy
      const strengthIndex = getStrengthValue(friendlyUnit, enemy.unitTypeId);
      if (strengthIndex > 0) {
        counterCount++;
      }

      // 2. Calculate the enemy's strength index against us (Defensive Penalty)
      // We look up the enemy unit in the ALMANAC to find its advantage over us
      const enemyUnitStats = almanacMap.get(enemy.unitTypeId);
      const enemyPenalty = enemyUnitStats ? getStrengthValue(enemyUnitStats, friendlyUnit.unitTypeId) : 0;

      if (enemyPenalty > 0) {
        counterCount--; // Penalize our counter if the enemy has an advantage over us
      }

      // Score for this slot is (Our Strength - Enemy Strength)
      totalScore += strengthIndex - enemyPenalty;
    });

    let quality: CounterQuality = 'Experimental';
    if (counterCount === 5) quality = 'Optimal';
    else if (counterCount >= 4) quality = 'Strong';
    else if (counterCount >= 2) quality = 'Decent';
    else if (counterCount >= 1) quality = 'Meh';

    return {
      unit: friendlyUnit,
      quality,
      score: totalScore,
      counterCount,
    };
  });

  // Sorting logic to pick the #1 recommendation
  return (
    results.sort((a, b) => {
      // 1. Priority by Quality Tier
      const qualityOrder: CounterQuality[] = ['Optimal', 'Strong', 'Decent', 'Meh', 'Experimental'];
      const qA = qualityOrder.indexOf(a.quality);
      const qB = qualityOrder.indexOf(b.quality);
      if (qA !== qB) return qA - qB;

      // 2. Priority by number of individual units countered
      if (b.counterCount !== a.counterCount) return b.counterCount - a.counterCount;

      // 3. Priority by aggregate strength score
      if (b.score !== a.score) return b.score - a.score;

      // 4. Preference for Ranged units (LR/HR) over Melee (LM/HM/MA)
      const typeA = getTroopType(a.unit.unitTypeId);
      const typeB = getTroopType(b.unit.unitTypeId);
      const isARanged = typeA === 'lr' || typeA === 'hr';
      const isBRanged = typeB === 'lr' || typeB === 'hr';
      if (isARanged !== isBRanged) return isBRanged ? 1 : -1;

      // 5. Tie-breaker: Prefer Heavy Ranged with Full Map Range
      const aFullRange = hasFullMapRange(a.unit.unitTypeId);
      const bFullRange = hasFullMapRange(b.unit.unitTypeId);
      if (aFullRange !== bFullRange) return bFullRange ? 1 : -1;

      return 0;
    })[0] || null
  );
}
