import { makeCityEntityEx } from '../testing/fixtures';
import { getChapterFromEntity, getCityBlockFromCityEntity, getTypeFromEntity } from './getCityBlockFromCityEntity';

describe('getTypeFromEntity', () => {
  it('suffixes standalone buildings with _y', () => {
    expect(getTypeFromEntity('standalone', 'A_Statue_1', 'culture')).toBe('culture_y');
  });

  it('suffixes chapter-prefixed buildings with _x', () => {
    expect(getTypeFromEntity('street', 'A_Ch5_Statue', 'culture')).toBe('culture_x');
  });

  it('leaves other buildings untouched', () => {
    expect(getTypeFromEntity('street', 'G_Steel_1', 'goods')).toBe('goods');
  });

  it('prefers _y over _x when a standalone building is also chapter-prefixed', () => {
    expect(getTypeFromEntity('standalone', 'A_Ch5_Statue', 'culture')).toBe('culture_y');
  });

  it('only matches a single leading letter before _Ch', () => {
    expect(getTypeFromEntity('street', 'Evt_Ch5_Statue', 'culture')).toBe('culture');
  });
});

describe('getChapterFromEntity', () => {
  it('returns an explicit chapter untouched', () => {
    expect(getChapterFromEntity(9, 'A_Ch5_Statue', 'culture', 1)).toBe(9);
  });

  it.each(['culture', 'culture_x', 'culture_y', 'culture_residential', 'expiring'])(
    'reads the chapter from a _Ch prefix for type %s',
    (type) => {
      expect(getChapterFromEntity(undefined, 'A_Ch5_Statue', type, 1)).toBe(5);
    },
  );

  it('falls back to a trailing number for culture buildings', () => {
    expect(getChapterFromEntity(undefined, 'A_Statue_7', 'culture', 1)).toBe(7);
  });

  it('prefers the _Ch prefix over a trailing number', () => {
    expect(getChapterFromEntity(undefined, 'A_Ch5_Statue_7', 'culture', 1)).toBe(5);
  });

  it('reports the level as the chapter for premium buildings', () => {
    expect(getChapterFromEntity(undefined, 'P_Residence_3', 'premium_residential', 3)).toBe(3);
    expect(getChapterFromEntity(undefined, 'R_Residence_3', 'premium_production', 3)).toBe(3);
  });

  it('ignores premium naming for non-premium types', () => {
    expect(getChapterFromEntity(undefined, 'P_Residence_3', 'residential', 3)).toBeUndefined();
  });

  it('returns undefined when nothing identifies a chapter', () => {
    expect(getChapterFromEntity(undefined, 'G_Steel_1', 'goods', 1)).toBeUndefined();
  });
});

describe('getCityBlockFromCityEntity', () => {
  it('seeds the original position from the current position', () => {
    const block = getCityBlockFromCityEntity(makeCityEntityEx({ x: 12, y: 34 }));

    expect(block).toMatchObject({
      x: 12,
      y: 34,
      originalX: 12,
      originalY: 34,
      moved: false,
      highlighted: false,
    });
  });

  it('uses a placeholder id that the caller is expected to replace', () => {
    expect(getCityBlockFromCityEntity(makeCityEntityEx()).id).toBe(-1);
  });

  it('defaults a missing footprint to a single tile', () => {
    const entity = makeCityEntityEx();
    // width/length are non-optional on the type but absent on raw game data
    delete (entity as Partial<typeof entity>).width;
    delete (entity as Partial<typeof entity>).length;

    const block = getCityBlockFromCityEntity(entity);

    expect(block.width).toBe(1);
    expect(block.length).toBe(1);
  });

  describe('label', () => {
    it('is the chapter for culture buildings', () => {
      const block = getCityBlockFromCityEntity(makeCityEntityEx({ cityentity_id: 'A_Ch5_Statue', type: 'culture' }));
      expect(block.label).toBe('5');
    });

    it('is the level for levelled buildings', () => {
      const block = getCityBlockFromCityEntity(
        makeCityEntityEx({ cityentity_id: 'G_Steel_4', type: 'goods', level: 4 }),
      );
      expect(block.label).toBe('4');
    });

    it('is the remaining days for expiring buildings', () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const block = getCityBlockFromCityEntity(
        makeCityEntityEx({
          cityentity_id: 'A_Evt_Tent',
          type: 'expiring',
          expirationEnd: now + 3 * 86_400_000,
        }),
      );

      expect(block.label).toBe('3d');
    });

    it('is undefined when no rule applies', () => {
      const block = getCityBlockFromCityEntity(makeCityEntityEx({ cityentity_id: 'A_Evt_Tent', type: 'expiring' }));
      expect(block.label).toBeUndefined();
    });
  });
});
