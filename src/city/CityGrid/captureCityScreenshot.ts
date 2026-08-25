import { GridMax, PaddingTiles } from '../gridConstants';
import { TileRect } from './screenshotFrame';

/** Pixels per tile in the saved picture, whatever the zoom on screen. */
export const SCREENSHOT_PX_PER_TILE = 30;

/**
 * Marks an element the screenshot leaves out: chrome that only means something while
 * the mouse is on the grid - hover washes and outlines, the ring around the block
 * being carried, the expansions on offer in unlock-area mode. Spread onto the element.
 */
export const SCREENSHOT_OMIT = { 'data-screenshot': 'omit' } as const;
const OMIT_SELECTOR = '[data-screenshot="omit"]';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Takes a picture of the top-down grid as it is drawn, framed on the given tiles.
 *
 * The grid is an SVG, so a copy of it is cut down to the frame and rasterised at a
 * fixed scale rather than read back from the screen: the picture comes out the same
 * at every zoom and is not clipped to the viewport. Two things about the live drawing
 * do not survive being loaded as an image on their own and are put right on the copy:
 * the chapter icons name the sprite sheet by URL, and an image loads no external
 * resources, so the sheet goes in as a data URL; and the text takes its font from the
 * page, which the copy has no access to, so the computed font is written onto it.
 *
 * The copy is taken before anything is awaited, so the picture is of the grid at the
 * moment of the call.
 */
export async function captureCityScreenshot(svg: SVGSVGElement, frame: TileRect): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll(OMIT_SELECTOR).forEach((el) => el.remove());

  // The live SVG is the padded grid at the on-screen zoom; its width gives the tile size.
  const tilePx = svg.width.baseVal.value / (GridMax + 2 * PaddingTiles);
  const paddingPx = PaddingTiles * tilePx;
  const viewBox = [
    paddingPx + frame.x * tilePx,
    paddingPx + frame.y * tilePx,
    frame.width * tilePx,
    frame.length * tilePx,
  ];
  copy.setAttribute('viewBox', viewBox.join(' '));
  const width = frame.width * SCREENSHOT_PX_PER_TILE;
  const height = frame.length * SCREENSHOT_PX_PER_TILE;
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.removeAttribute('style');
  copy.style.fontFamily = getComputedStyle(svg).fontFamily;

  await inlineImages(copy);

  const xml = new XMLSerializer().serializeToString(copy);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No 2D canvas context');
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The canvas produced no image'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Puts every picture the copy references inline. Each distinct URL is fetched once
 * and defined once, and the elements that referenced it become uses of that
 * definition: the sprite sheet is referenced by every block with a chapter icon, and
 * a data URL in each of them would put the whole sheet in the file that many times
 * over. A picture that cannot be fetched is left out rather than failing the shot.
 */
async function inlineImages(copy: SVGSVGElement): Promise<void> {
  const images = Array.from(copy.querySelectorAll('image'));
  const hrefs = new Set(
    images
      .map((image) => image.getAttribute('href'))
      .filter((href): href is string => !!href && !href.startsWith('data:')),
  );
  if (hrefs.size === 0) return;

  const defs = copy.ownerDocument.createElementNS(SVG_NS, 'defs');
  copy.prepend(defs);
  await Promise.all(
    Array.from(hrefs).map(async (href, i) => {
      const users = images.filter((image) => image.getAttribute('href') === href);
      const dataUrl = await fetchAsDataUrl(href);
      if (!dataUrl) {
        users.forEach((image) => image.remove());
        return;
      }
      const id = `screenshot-image-${i}`;
      const shared = users[0].cloneNode(true) as SVGImageElement;
      shared.setAttribute('id', id);
      shared.setAttribute('href', dataUrl);
      shared.removeAttribute('x');
      shared.removeAttribute('y');
      defs.append(shared);
      users.forEach((image) => {
        const use = copy.ownerDocument.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', `#${id}`);
        for (const name of ['x', 'y']) {
          const value = image.getAttribute(name);
          if (value !== null) use.setAttribute(name, value);
        }
        image.replaceWith(use);
      });
    }),
  );
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('ElvenAssist: Could not fetch a picture for the screenshot, leaving it out: ', url, err);
    return null;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The screenshot could not be rendered as an image'));
    image.src = url;
  });
}
