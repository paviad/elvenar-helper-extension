import { getPrefix } from './getPrefix';

// getPrefix builds the key used to look up a building's max level in the
// maxLevels map, so these groupings decide which buildings share a level cap.
describe('getPrefix', () => {
  it('keeps the settlement name for B_ buildings', () => {
    expect(getPrefix('B_Orcs_Hut_3', 'settlement')).toBe('B_Orcs_Hut');
  });

  it('returns a sentinel for B_ buildings with no trailing level', () => {
    expect(getPrefix('B_Orcs_Hut', 'settlement')).toBe('@');
  });

  it('marks premium buildings with an X prefix', () => {
    expect(getPrefix('P_Residence_3', 'premium_residential')).toBe('XP');
    expect(getPrefix('R_Workshop_3', 'premium_production')).toBe('XR');
  });

  it('checks premium before military', () => {
    expect(getPrefix('M_A_Barracks_2', 'premium_military')).toBe('XM');
  });

  it('splits military buildings by their unit letter', () => {
    expect(getPrefix('M_A_Barracks_2', 'military')).toBe('MA');
    expect(getPrefix('M_B_Camp_2', 'military')).toBe('MB');
  });

  it('falls back to the leading letter', () => {
    expect(getPrefix('G_Steel_1', 'goods')).toBe('G');
    expect(getPrefix('A_Ch5_Statue', 'culture')).toBe('A');
  });

  it('checks the B_ rule before the premium rule', () => {
    expect(getPrefix('B_Orcs_Hut_3', 'premium_settlement')).toBe('B_Orcs_Hut');
  });
});
