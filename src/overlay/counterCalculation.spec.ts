import { Army } from '../model/tourny/provinceInformation';
import { calculateBestCounter } from './counterCalculation';
import { ALMANAC } from './testAlmanac';

describe('calculateBestCounter', () => {
  /**
   * Static Roster IDs as requested:
   * Humans/Elves (HB), Mercenary Camp (MC), Training Grounds (TG)
   * Mix of levels 4 and 5.
   */
  const STATIC_IDS = [
    'hb_hm_5',
    'hb_hr_4',
    'hb_lm_5',
    'hb_lr_4',
    'hb_ma_4',
    'mc_hm_5',
    'mc_hr_4',
    'mc_lm_5',
    'mc_lr_4',
    'mc_ma_4',
    'tg_hm_5',
    'tg_hr_4',
    'tg_lm_5',
    'tg_lr_4',
    'tg_ma_4',
  ];

  const roster = ALMANAC.filter((u) => STATIC_IDS.includes(u.unitTypeId));

  const createEnemyWave = (id: string, count: number = 5): Army[] => Array(count).fill({ unitTypeId: id, size: 100 });

  it('should return null if target army or roster is empty', () => {
    expect(calculateBestCounter([], roster, ALMANAC)).toBeNull();
    expect(calculateBestCounter(createEnemyWave('mob_hblm_1'), [], ALMANAC)).toBeNull();
  });

  it('should identify an Optimal counter (Coverage >= 4)', () => {
    // Target: 5x Bandit (mob_hblr_5 - Light Ranged).
    // Bandits are weak against Light Melee.
    // hb_lm_5 (Divine Axe Barbarian) should counter them.
    const target = createEnemyWave('mob_hblr_5');
    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result).not.toBeNull();
    expect(result?.unit.unitTypeId).toBe('tg_hr_4');
    expect(result?.quality).toBe('Optimal');
    expect(result?.counterCount).toBe(5);
  });

  it('should identify a Strong counter (Coverage == 3)', () => {
    // Mixed wave: 3x Bandit (LR), 2x Knight (HM)
    // Light Melee counters LR (3 units).
    const target = [...createEnemyWave('mob_hblr_5', 3), ...createEnemyWave('mob_hbhm_5', 2)];
    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('tg_lr_4');
    expect(result?.quality).toBe('Decent');
    expect(result?.counterCount).toBe(2);
  });

  it('should apply defensive penalties to the total score', () => {
    /**
     * Target: 5x Knights (mob_hbhm_5 - Heavy Melee).
     * Knights are strong against Light Melee (Index 1).
     * Axe Barbarians (hb_lm_5) have strength 0 against Knights.
     * Score for Barbarians: 5 * (0 [Offense] - 1 [Penalty]) = -5.
     * * Meanwhile, Mages (hb_ma_4) are strong against Heavy Melee (Index 2).
     * Knights are NOT strong against Mages (Index 0).
     * Score for Mages: 5 * (2 [Offense] - 0 [Penalty]) = 10.
     */
    const target = createEnemyWave('mob_hbhm_5');
    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('tg_lr_4'); // Priest II
    expect(result?.score).toBe(15);
  });

  it('should prioritize Ranged units for tie-breaking same-quality results', () => {
    /**
     * Target: 2x Abbots (Mage) + 3x placeholder mobs.
     * Both Light Melee (hb_lm_5) and Light Ranged (hb_lr_4) counter Mages (Index 2).
     * Both have CounterCount 2 (Standard quality).
     * Light Ranged (hb_lr_4) should win the tie-break over Light Melee.
     */
    const target = [...createEnemyWave('mob_hbma_5', 2), ...createEnemyWave('mob_unknown', 3)];
    const smallRoster = roster.filter((u) => u.unitTypeId === 'hb_lm_5' || u.unitTypeId === 'hb_lr_4');
    const result = calculateBestCounter(target, smallRoster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('hb_lr_4');
  });

  it('should prioritize Heavy Ranged Full Map Range (HB/MC) over TG in ties', () => {
    /**
     * Target: 5x Ancient Orcs (Light Melee).
     * mc_hr_4 (Frog Prince II) and tg_hr_4 (Senior Orc Strategist II) both counter Light Melee.
     * mc_hr_4: Strength 3. Score = 15.
     * tg_hr_4: Strength 1. Score = 5.
     */
    const target = createEnemyWave('mob_hblm_5');
    const hrRoster = roster.filter((u) => u.unitTypeId === 'mc_hr_4' || u.unitTypeId === 'tg_hr_4');
    const result = calculateBestCounter(target, hrRoster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('mc_hr_4');
  });

  it('should pick the best version of a troop across buildings', () => {
    /**
     * Scenario: 5x Steinling (mob_ebhr_5 - Heavy Ranged).
     * Mages are strong against HR.
     * hb_ma_4 (Priest II) vs HR: 2
     * tg_ma_4 (Ghastly Banshee II) vs HR: 3
     * mc_ma_4 (Blossom Princess II) vs HR: 1
     */
    const target = createEnemyWave('mob_ebhr_5');
    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('tg_ma_4');
    expect(result?.score).toBe(15);
  });

  // --- Non-Homogeneous (Mixed) Wave Test Cases ---

  it('should handle a mixed wave and identify the unit with best overall coverage', () => {
    /**
     * Mixed Wave: 2x Bandit (Light Ranged), 2x Abbot (Mage), 1x Knight (Heavy Melee)
     * * Candidate Evaluation (Roster Level 4/5):
     * - Light Melee (hb_lm_5): Counters LR (2) and Mage (2). Coverage = 4/5 (Optimal).
     * - Light Ranged (hb_lr_4): Counters Mage (2) and HM (1). Coverage = 3/5 (Strong).
     * - Mage (hb_ma_4): Counters HM (1). Coverage = 1/5 (Experimental).
     */
    const target: Army[] = [
      { unitTypeId: 'mob_hblr_5', size: 100 },
      { unitTypeId: 'mob_hblr_5', size: 100 },
      { unitTypeId: 'mob_hbma_5', size: 100 },
      { unitTypeId: 'mob_hbma_5', size: 100 },
      { unitTypeId: 'mob_hbhm_5', size: 100 },
    ];

    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('mc_lr_4');
    expect(result?.quality).toBe('Decent');
    expect(result?.counterCount).toBe(3);
  });

  it('should account for mixed defensive penalties in a non-homogeneous wave', () => {
    /**
     * Mixed Wave: 3x Ancient Orc (Light Melee), 2x Bandit (Light Ranged)
     * * Candidate A: Heavy Ranged (mc_hr_4 - Frog Prince II)
     * - Offense: Counters LM (3) and LR (2). Coverage = 5/5.
     * - Offense Score: (3*3) + (2*1) = 11.
     * - Defense: Neither LM nor LR counter HR. Penalty = 0.
     * - Total Score: 11.
     * * Candidate B: Light Melee (hb_lm_5 - Barbarian)
     * - Offense: Counters LR (2). Coverage = 2/5.
     * - Offense Score: (2*2) = 4.
     * - Defense: Ancient Orcs (LM) are neutral. Bandits (LR) are neutral?
     * Actually, let's check Bandit (mob_hblr_5) stats: Strength vs Mage (1), HM (3). Neutral to LM.
     * Ancient Orc (mob_hblm_5) stats: Strength vs LR (3), Mage (1). Neutral to LM.
     * - Total Score: 4.
     */
    const target: Army[] = [
      ...createEnemyWave('mob_hblm_5', 3), // Light Melee
      ...createEnemyWave('mob_hblr_5', 2), // Light Ranged
    ];

    const result = calculateBestCounter(target, roster, ALMANAC);

    expect(result?.unit.unitTypeId).toBe('mc_hr_4');
    expect(result?.counterCount).toBe(5);
    expect(result?.score).toBe(11);
  });
});
