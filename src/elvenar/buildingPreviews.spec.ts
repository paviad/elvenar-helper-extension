import {
  assetBaseOf,
  buildingPreviewUrl,
  extractBuildingPreviews,
  findBuildingPreview,
  GAME_CLIENT_SCRIPT_REGEX,
} from './buildingPreviews';

const SCRIPT_URL = 'https://oxen.innogamescdn.com/cache/elvenar-release-min-60c1f705ee19ddf79a35fc142d786168.js';

describe('GAME_CLIENT_SCRIPT_REGEX', () => {
  it('matches the client script', () => {
    expect(GAME_CLIENT_SCRIPT_REGEX.test(SCRIPT_URL)).toBe(true);
  });

  it('does not match the game’s other scripts', () => {
    expect(GAME_CLIENT_SCRIPT_REGEX.test('https://en3.elvenar.com/cache/merged_game-f98556fc1f5d.js')).toBe(false);
  });
});

describe('assetBaseOf', () => {
  it('puts the assets on the script’s host', () => {
    expect(assetBaseOf(SCRIPT_URL)).toBe('https://oxen.innogamescdn.com/frontend//assets/');
  });
});

describe('extractBuildingPreviews', () => {
  it('keeps both pictures of each building and nothing from the other maps', () => {
    const source =
      'zoa.data={rawAssetFiles:{A_atlas:"iso_a.atf"},textureAssetFiles:{' +
      'G_Elves_FactoryElixir_39_preview:"iso_g.png",G_Elves_FactoryElixir_39_preview_large:"iso_gl.png"}};';

    expect(extractBuildingPreviews(source)).toEqual({
      files: { G_Elves_FactoryElixir_39: 'iso_g.png' },
      largeFiles: { G_Elves_FactoryElixir_39: 'iso_gl.png' },
    });
  });

  it('reads past a quoted key that holds a brace', () => {
    const source =
      'textureAssetFiles:{"A_Evt_Easter_XXII_Ludibria_Ventis${chapter}16_1_preview":"iso_e.png",' +
      'A_Ch17_Large1_1_preview:"iso_c.png"}';

    expect(extractBuildingPreviews(source)?.files).toEqual({
      'A_Evt_Easter_XXII_Ludibria_Ventis${chapter}16_1': 'iso_e.png',
      A_Ch17_Large1_1: 'iso_c.png',
    });
  });

  it('reads the unminified form', () => {
    const source = '{ "textureAssetFiles" : { "A_Ch17_Large1_1_preview" : "iso_c.png", "lastItem" : "" } }';

    expect(extractBuildingPreviews(source)?.files).toEqual({ A_Ch17_Large1_1: 'iso_c.png' });
  });

  it('returns undefined when the map is missing', () => {
    expect(extractBuildingPreviews('var a={rawAssetFiles:{}};')).toBeUndefined();
  });
});

describe('findBuildingPreview', () => {
  const files = {
    A_Evt_Alien_Egg10_1: 'iso_old.png',
    A_Evt_Alien_Egg_10: 'iso_new.png',
    G_Humans_FactoryStone_1: 'iso_g.png',
  };

  it('finds a plain id', () => {
    expect(findBuildingPreview(files, 'G_Humans_FactoryStone_1')).toBe('iso_g.png');
  });

  it('prefers the old form of a chapter-suffixed event id, as the game does', () => {
    expect(findBuildingPreview(files, 'A_Evt_Alien_Egg_10')).toBe('iso_old.png');
  });

  it('falls back to the id itself when the old form has no picture', () => {
    expect(findBuildingPreview({ A_Evt_Alien_Egg_10: 'iso_new.png' }, 'A_Evt_Alien_Egg_10')).toBe('iso_new.png');
  });

  it('returns undefined for an unknown building', () => {
    expect(findBuildingPreview(files, 'A_Nothing_1')).toBeUndefined();
  });
});

describe('buildingPreviewUrl', () => {
  const previews = {
    assetBase: 'https://oxen.innogamescdn.com/frontend//assets/',
    files: { S_Humans_Trail: 'iso_s.png' },
    largeFiles: { S_Humans_Trail: 'iso_sl.png' },
  };

  it('joins the asset base and the file', () => {
    expect(buildingPreviewUrl(previews, 'S_Humans_Trail')).toBe(
      'https://oxen.innogamescdn.com/frontend//assets/iso_s.png',
    );
  });

  it('gives the large picture when asked', () => {
    expect(buildingPreviewUrl(previews, 'S_Humans_Trail', 'large')).toBe(
      'https://oxen.innogamescdn.com/frontend//assets/iso_sl.png',
    );
  });
});
