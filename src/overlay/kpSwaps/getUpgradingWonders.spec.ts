import { CityEntity } from '../../model/cityEntity';
import { makeCityEntityEx } from '../../testing/fixtures';
import { getUpgradingWonders } from './getUpgradingWonders';

const entity = (cityentityId: string, type: string, stateClass?: string): CityEntity =>
  makeCityEntityEx({
    cityentity_id: cityentityId,
    type,
    // The rest of a state is whatever that state carries; only its name is read here.
    state: stateClass ? ({ __class__: stateClass } as CityEntity['state']) : undefined,
  });

describe('getUpgradingWonders', () => {
  it('names a wonder whose new level is going up', () => {
    const city = [entity('B_Humans_AW1_3', 'ancient_wonder', 'UpgradingVO')];

    expect([...getUpgradingWonders(city)]).toEqual(['B_Humans_AW1']);
  });

  it('leaves out a wonder that is doing anything else', () => {
    const city = [
      entity('B_All_AW4_1', 'ancient_wonder', 'IdleVO'),
      entity('B_All_AW2_10', 'ancient_wonder', 'ProducingVO'),
      entity('B_Gr7_AW1_22', 'ancient_wonder'),
    ];

    expect(getUpgradingWonders(city).size).toBe(0);
  });

  it('ignores an ordinary building that is upgrading', () => {
    const city = [entity('G_Steel_1', 'production', 'UpgradingVO')];

    expect(getUpgradingWonders(city).size).toBe(0);
  });

  it('copes with no city at all', () => {
    expect(getUpgradingWonders(undefined).size).toBe(0);
    expect(getUpgradingWonders([]).size).toBe(0);
  });
});
