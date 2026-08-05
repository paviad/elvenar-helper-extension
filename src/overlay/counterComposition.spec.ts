import { Army } from '../model/tourny/provinceInformation';
import { calculateCounterComposition, parseUnitId } from './counterComposition';
import { ALMANAC } from './testAlmanac';

/** The squad size seen in a real level-1 province, which sizes every slot below. */
const PLAYER_SQUAD_SIZE = 5100;

/** One unit of each class from each building the player can have all of at once. */
const ROSTER_IDS = [
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

const roster = ALMANAC.filter((u) => ROSTER_IDS.includes(u.unitTypeId));

const wave = (...unitTypeIds: string[]): Army[] =>
  unitTypeIds.map((unitTypeId) => ({ unitTypeId, size: 100 }) as Army);

const compose = (army: Army[], stock?: Record<string, number>) =>
  calculateCounterComposition(army, roster, ALMANAC, PLAYER_SQUAD_SIZE, stock);

/** Turns a composition into `['3x tg_hr_4', '2x tg_lr_4']` for readable assertions. */
const summarize = (result: ReturnType<typeof compose>) =>
  result?.slots.map((slot) => `${slot.squads}x ${slot.unit.unitTypeId}`);

describe('parseUnitId', () => {
  it('reads the friendly form', () => {
    expect(parseUnitId('hb_lr_4')).toEqual({ building: 'hb', troopType: 'lr' });
    expect(parseUnitId('mc_hm_5')).toEqual({ building: 'mc', troopType: 'hm' });
  });

  it('reads the enemy form, where the two codes run together', () => {
    expect(parseUnitId('mob_hblr_5')).toEqual({ building: 'hb', troopType: 'lr' });
    expect(parseUnitId('mob_tghr_1')).toEqual({ building: 'tg', troopType: 'hr' });
  });

  it('rejects ids it cannot read', () => {
    expect(parseUnitId('mob_zzzz_1')).toBeNull();
    expect(parseUnitId('something_else')).toBeNull();
  });
});

describe('calculateCounterComposition', () => {
  it('returns null when there is nothing to work with', () => {
    expect(compose([])).toBeNull();
    expect(calculateCounterComposition(wave('mob_hblr_5'), [], ALMANAC, PLAYER_SQUAD_SIZE)).toBeNull();
    expect(calculateCounterComposition(wave('mob_hblr_5'), roster, ALMANAC, 0)).toBeNull();
  });

  it('fields a single unit type against a uniform wave', () => {
    // Wily Bandit is light ranged; Senior Orc Strategist brings 3 swords against light ranged
    // and the Bandit has none back against heavy ranged.
    const result = compose(wave('mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5'));

    expect(summarize(result)).toEqual(['5x tg_hr_4']);
    expect(result?.coverage).toBe(5);
    expect(result?.exposed).toBe(0);
    expect(result?.score).toBe(15);
    expect(result?.quality).toBe('Optimal');
  });

  it('blends two unit types against a split wave', () => {
    // 3 light ranged answered by the Orc Strategist, 2 heavy melee by the Poison Dryad, which
    // brings 3 swords against heavy melee while the Knight has none against light ranged.
    const result = compose(wave('mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hbhm_5', 'mob_hbhm_5'));

    expect(summarize(result)).toEqual(['3x tg_hr_4', '2x tg_lr_4']);
    expect(result?.coverage).toBe(5);
    expect(result?.exposed).toBe(0);
    expect(result?.quality).toBe('Optimal');
  });

  it('blends three unit types against the wave from a real level-1 province', () => {
    // Captured encounter: 2 Wild Archers (LR), a Swamp Monster (HM), an Orc Deserter and a
    // Cannoneer (both HR). Matches the player guide: Orc Strategist for LR, Dryad for HM,
    // Vallorian for HR.
    const result = compose(wave('mob_eblr_1', 'mob_eblr_1', 'mob_ebhm_1', 'mob_tghr_1', 'mob_hbhr_1'));

    expect(summarize(result)).toEqual(['2x mc_hm_5', '2x tg_hr_4', '1x tg_lr_4']);
    expect(result?.slots.find((s) => s.unit.unitTypeId === 'tg_hr_4')?.answers).toEqual([0, 1]);
    expect(result?.slots.find((s) => s.unit.unitTypeId === 'tg_lr_4')?.answers).toEqual([2]);
    expect(result?.slots.find((s) => s.unit.unitTypeId === 'mc_hm_5')?.answers).toEqual([3, 4]);
    expect(result?.coverage).toBe(5);
  });

  it('sizes each slot by the unit weight, the way the game does', () => {
    const result = compose(wave('mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hbhm_5', 'mob_hbhm_5'));

    // Orc Strategist weighs 4, Poison Dryad weighs 1.
    const strategist = result?.slots.find((s) => s.unit.unitTypeId === 'tg_hr_4');
    expect(strategist?.sizePerSquad).toBe(PLAYER_SQUAD_SIZE / 4);
    expect(strategist?.totalUnits).toBe((PLAYER_SQUAD_SIZE / 4) * 3);

    const dryad = result?.slots.find((s) => s.unit.unitTypeId === 'tg_lr_4');
    expect(dryad?.sizePerSquad).toBe(PLAYER_SQUAD_SIZE);
    expect(dryad?.totalUnits).toBe(PLAYER_SQUAD_SIZE * 2);
  });

  it('always fills exactly five squads', () => {
    const result = compose(wave('mob_eblr_1', 'mob_ebhm_1', 'mob_tghr_1', 'mob_hbhr_1', 'mob_hbma_5'));
    expect(result?.slots.reduce((sum, slot) => sum + slot.squads, 0)).toBe(5);
  });

  describe('when stock is short', () => {
    // Enough Orc Strategists for two squads only. Everything else is plentiful.
    const stock = {
      tg_hr_4: 2 * (PLAYER_SQUAD_SIZE / 4),
      mc_hr_4: 99_999,
      hb_lr_4: 99_999,
      tg_lr_4: 99_999,
    };
    const uniformWave = wave('mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5');

    it('spends what there is and falls back for the rest', () => {
      // Frog Prince is the next answer to light ranged, at 1 sword rather than 3.
      expect(summarize(compose(uniformWave, stock))).toEqual(['3x mc_hr_4', '2x tg_hr_4']);
      // The same call without stock is what the view offers as the composition to train towards.
      expect(summarize(compose(uniformWave))).toEqual(['5x tg_hr_4']);
    });

    it('grades the fallback below the composition it could not field', () => {
      expect(compose(uniformWave, stock)?.score).toBe(9);
      expect(compose(uniformWave, stock)?.quality).toBe('Strong');
      expect(compose(uniformWave)?.quality).toBe('Optimal');
    });

    it('keeps the ideal answer when nothing at all can be fielded', () => {
      // Holding none of anything must not degrade the advice into an arbitrary unit.
      expect(summarize(compose(uniformWave, {}))).toEqual(['5x tg_hr_4']);
    });

    it('leaves the composition alone when stock covers the ideal', () => {
      const plentiful = { tg_hr_4: 99_999 };

      expect(summarize(compose(uniformWave, plentiful))).toEqual(summarize(compose(uniformWave)));
    });
  });

  it('still fills the slot facing an enemy it cannot identify', () => {
    const result = compose(wave('mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_hblr_5', 'mob_zzzz_9'));

    expect(result?.slots.reduce((sum, slot) => sum + slot.squads, 0)).toBe(5);
    expect(result?.coverage).toBe(4);
  });
});
