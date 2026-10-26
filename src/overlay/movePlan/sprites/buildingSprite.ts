import { getFromStorage } from '../../../chrome/storage';
import { BUILDING_ATLASES_KEY, BuildingAtlases } from '../../../elvenar/buildingAtlases';
import { atlasOf, BUILDING_RENDERS_KEY, BuildingRender } from '../../../elvenar/buildingRenders';
import { smartDecompress } from '../../../util/compression';
import { decodeDxt, parseAtf } from './atf';
import { parseTextureAtlas, Placement, placePicture, SubTexture } from './textureAtlas';

/** A building as the game draws it in the city, and the point of the picture that goes on its anchor. */
export interface Sprite {
  image: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
}

let renders: Promise<Record<string, BuildingRender> | undefined> | undefined;
let atlases: Promise<BuildingAtlases | undefined> | undefined;

const readRenders = () =>
  (renders ??= getFromStorage(BUILDING_RENDERS_KEY).then(async (stored) =>
    stored ? (JSON.parse(await smartDecompress(stored)) as Record<string, BuildingRender>) : undefined,
  ));

const readAtlases = () =>
  (atlases ??= getFromStorage(BUILDING_ATLASES_KEY).then((stored) =>
    stored ? (JSON.parse(stored) as BuildingAtlases) : undefined,
  ));

/** Event and sale buildings whose id ends in the chapter, e.g. A_Evt_Winter_3Tree_24. */
const NEW_CHAPTER_ID = /(A_Evt|A_Sale).*\D+_\d+$/;

/**
 * How a building id is drawn. A chapter-suffixed event building is drawn under the id's older
 * form, A_Evt_Winter_3Tree_24 under A_Evt_Winter_3Tree24_1, as its build-menu picture is.
 */
const renderOf = (all: Record<string, BuildingRender>, id: string) =>
  all[id] ?? (NEW_CHAPTER_ID.test(id) ? all[id.replace(/_(\d+)$/, '$1_1')] : undefined);

interface LoadedAtlas {
  canvas: HTMLCanvasElement;
  pictures: Record<string, SubTexture>;
}

const loadedAtlases = new Map<string, Promise<LoadedAtlas | undefined>>();

/**
 * An atlas's pixels and picture names, decoded once and kept. The game has fetched the files for
 * every building in view already, so they come out of the browser's cache.
 */
const loadAtlas = (key: string, files: BuildingAtlases) => {
  let loading = loadedAtlases.get(key);
  if (!loading) {
    loading = (async () => {
      const atf = files.atf[key];
      const xml = files.xml[key];
      if (!atf || !xml) return undefined;
      const [bytes, text] = await Promise.all([
        fetch(files.assetBase + atf, { cache: 'force-cache' }).then((r) => r.arrayBuffer()),
        fetch(files.assetBase + xml, { cache: 'force-cache' }).then((r) => r.text()),
      ]);
      const texture = parseAtf(new Uint8Array(bytes));
      if (!texture) return undefined;
      const canvas = document.createElement('canvas');
      canvas.width = texture.width;
      canvas.height = texture.height;
      canvas.getContext('2d')!.putImageData(new ImageData(decodeDxt(texture), texture.width, texture.height), 0, 0);
      return { canvas, pictures: parseTextureAtlas(text) };
    })().catch(() => undefined);
    loadedAtlases.set(key, loading);
  }
  return loading;
};

/** Draws an atlas picture at its place, turning back one stored a quarter turned. */
const drawPicture = (
  context: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement,
  picture: SubTexture,
  at: Placement,
  offsetX: number,
  offsetY: number,
) => {
  const x = at.left + offsetX;
  const y = at.top + offsetY;
  if (!picture.rotated) {
    context.drawImage(atlas, picture.x, picture.y, picture.width, picture.height, x, y, picture.width, picture.height);
    return;
  }
  // Stored turned a quarter clockwise: its top edge is shown as the left one, running upwards.
  context.save();
  context.translate(x, y + picture.width);
  context.rotate(-Math.PI / 2);
  context.drawImage(atlas, picture.x, picture.y, picture.width, picture.height, 0, 0, picture.width, picture.height);
  context.restore();
};

const loadedSprites = new Map<string, Promise<Sprite | undefined>>();

/**
 * A building's picture as the game draws it in the city: its base, and for an animated building
 * the animation's first frame on top, each put by its own pivot on the building's anchor.
 * Undefined until the extension has read the game's render config and client script.
 */
export const loadBuildingSprite = (id: string): Promise<Sprite | undefined> => {
  let loading = loadedSprites.get(id);
  if (!loading) {
    loading = (async () => {
      const [all, files] = await Promise.all([readRenders(), readAtlases()]);
      const render = all && renderOf(all, id);
      if (!render || !files) return undefined;
      const atlas = await loadAtlas(atlasOf(render), files);
      const base = atlas?.pictures.base_frame_00;
      if (!atlas || !base) return undefined;

      const layers: { picture: SubTexture; at: Placement }[] = [
        { picture: base, at: placePicture(base, render.pivot) },
      ];
      const frame = atlas.pictures.animation_frame_00;
      if (render.animation && frame) {
        layers.push({ picture: frame, at: placePicture(frame, render.animation) });
      }

      const left = Math.min(...layers.map((l) => l.at.left));
      const top = Math.min(...layers.map((l) => l.at.top));
      const right = Math.max(...layers.map((l) => l.at.left + l.at.width));
      const bottom = Math.max(...layers.map((l) => l.at.top + l.at.height));
      const image = document.createElement('canvas');
      image.width = right - left;
      image.height = bottom - top;
      const context = image.getContext('2d')!;
      for (const { picture, at } of layers) {
        drawPicture(context, atlas.canvas, picture, at, -left, -top);
      }
      return { image, anchorX: -left, anchorY: -top };
    })().catch(() => undefined);
    loadedSprites.set(id, loading);
  }
  return loading;
};
