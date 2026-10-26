/**
 * How the game draws each building in the city, from the render config it loads at startup
 * (`renderconfigdata-<hash>.json`, some 15 MB). Kept to what drawing a still building takes: the
 * sprite sheet, and the point of each picture that goes on the building's anchor - the top corner
 * of its footprint, that of the tile it is placed at.
 */

export const RENDER_CONFIG_REGEX =
  /^https:\/\/[a-z]+\.innogamescdn\.com\/frontend\/\/assets\/renderconfigdata-[0-9a-f]+\.json$/;

export const BUILDING_RENDERS_KEY = 'buildingRenders';
/** The render config the stored renders were read from, so a release is read only once. */
export const BUILDING_RENDERS_SOURCE_KEY = 'buildingRendersSource';

/** A point in a picture, in its pixels, that goes on the building's anchor. */
export interface Pivot {
  x: number;
  y: number;
}

export interface BuildingRender {
  /** The idle sprite sheet, which names the atlas. */
  sheet: string;
  pivot: Pivot;
  /**
   * For an animated building, where its animation goes. Its atlas then comes in a still version
   * holding the animation's first frame beside the base picture, which is the one drawn.
   */
  animation?: Pivot;
}

interface SheetRaw {
  type: string;
  id: string;
  x: number;
  y: number;
}

interface BuildingConfigRaw {
  id: string;
  sprite_sheets?: SheetRaw[];
  animations?: SheetRaw[];
}

/** Building id -> how it is drawn, for every building with an idle sprite sheet. */
export function slimRenderConfig(raw: { building_configs?: BuildingConfigRaw[] }): Record<string, BuildingRender> {
  const renders: Record<string, BuildingRender> = {};
  for (const config of raw.building_configs ?? []) {
    const idle = config.sprite_sheets?.find((sheet) => sheet.type === 'idle');
    if (!idle) continue;
    const animation = config.animations?.[0];
    renders[config.id] = {
      sheet: idle.id,
      pivot: { x: idle.x, y: idle.y },
      ...(animation ? { animation: { x: animation.x, y: animation.y } } : {}),
    };
  }
  return renders;
}

/** The atlas a building is drawn from: the still version for an animated one. */
export const atlasOf = (render: BuildingRender) => (render.animation ? `${render.sheet}_firstframe` : render.sheet);
