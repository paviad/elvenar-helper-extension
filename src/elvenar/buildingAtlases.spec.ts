import { extractBuildingAtlases } from './buildingAtlases';
import { atlasOf, RENDER_CONFIG_REGEX, slimRenderConfig } from './buildingRenders';

describe('extractBuildingAtlases', () => {
  // The shape the client script has the tables in (2026-10-26), cut to a few entries.
  const source =
    'zoa.data={rawAssetFiles:{O_Humans_Armory_12_atlas:"iso_x.atf",O_Humans_Armory_12_firstframe_atlas:"iso_x.atf",' +
    'effects:"effects.atf"},textureAssetFiles:{O_Humans_Armory_12_preview:"iso_p.png"},' +
    'xmlAssetFiles:{O_Humans_Armory_12_atlas:"iso_x.xml","A_Evt_Ludibria${chapter}_atlas":"iso_l.xml"}};';

  it('keeps the atlases of both tables, by atlas name', () => {
    expect(extractBuildingAtlases(source)).toEqual({
      atf: { O_Humans_Armory_12: 'iso_x.atf', O_Humans_Armory_12_firstframe: 'iso_x.atf' },
      xml: { O_Humans_Armory_12: 'iso_x.xml', 'A_Evt_Ludibria${chapter}': 'iso_l.xml' },
    });
  });

  it('finds nothing in a client that no longer has the tables, rather than no atlases', () => {
    expect(extractBuildingAtlases('zoa.data={textureAssetFiles:{}}')).toBeUndefined();
  });
});

describe('the render config', () => {
  it('is recognised by its URL', () => {
    expect(
      RENDER_CONFIG_REGEX.test(
        'https://oxen.innogamescdn.com/frontend//assets/renderconfigdata-62970b9da2b78ca2419de33f3db30f5a.json',
      ),
    ).toBe(true);
  });

  // As the game has them (2026-10-26): the Paper Mill animates, the Armory does not.
  const raw = {
    building_configs: [
      {
        id: 'G_Humans_FactoryPaper_39',
        sprite_sheets: [
          { type: 'construction', id: 'C_Gr5_4x8', x: 432, y: 7 },
          { type: 'idle', id: 'G_Humans_FactoryPaper_39', x: 414, y: 150 },
        ],
        animations: [{ type: 'animation', id: 'G_Humans_FactoryPaper_39_Animation', x: 187, y: 76 }],
      },
      {
        id: 'O_Humans_Armory_12',
        sprite_sheets: [{ type: 'idle', id: 'O_Humans_Armory_12', x: 207, y: 70 }],
        animations: [],
      },
      { id: 'Decoration_Without_Idle', sprite_sheets: [{ type: 'construction', id: 'C', x: 0, y: 0 }] },
    ],
  };

  it('keeps each building’s idle sheet and where its pictures go on the anchor', () => {
    expect(slimRenderConfig(raw)).toEqual({
      G_Humans_FactoryPaper_39: {
        sheet: 'G_Humans_FactoryPaper_39',
        pivot: { x: 414, y: 150 },
        animation: { x: 187, y: 76 },
      },
      O_Humans_Armory_12: { sheet: 'O_Humans_Armory_12', pivot: { x: 207, y: 70 } },
    });
  });

  it('draws an animated building from the still version of its atlas', () => {
    const renders = slimRenderConfig(raw);

    expect(atlasOf(renders.G_Humans_FactoryPaper_39)).toBe('G_Humans_FactoryPaper_39_firstframe');
    expect(atlasOf(renders.O_Humans_Armory_12)).toBe('O_Humans_Armory_12');
  });
});
