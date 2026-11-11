import { worldMapNotice } from './worldMapNotice';

describe('worldMapNotice', () => {
  it('says nothing when every incomplete province is placed', () => {
    expect(worldMapNotice(undefined)).toBeUndefined();
    expect(worldMapNotice({ unlocated: 0 })).toBeUndefined();
  });

  it('says how many are missing and opens the World Map page', () => {
    expect(worldMapNotice({ unlocated: 1 })?.title).toBe('World map: 1 incomplete province not located');
    expect(worldMapNotice({ unlocated: 52 })).toMatchObject({
      title: 'World map: 52 incomplete provinces not located',
      page: 'world-map',
    });
  });
});
