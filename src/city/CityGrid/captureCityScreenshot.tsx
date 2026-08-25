import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { GridSize } from '../gridConstants';
import { TileRect } from './screenshotFrame';
import { CityScene, CityScreenshotSvg } from './top/CityScreenshotSvg';

/**
 * Marks an element the screenshot leaves out. The picture is drawn afresh with none of
 * the live grid's chrome, but the hover wash comes through: a block reads the hover
 * from a store the two drawings share. Spread onto the element.
 */
export const SCREENSHOT_OMIT = { 'data-screenshot': 'omit' } as const;
const OMIT_SELECTOR = '[data-screenshot="omit"]';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Takes a picture of the city as the top-down view draws it at zoom 1, framed on the
 * given tiles: GridSize pixels to a tile, so the picture is exactly the frame's size.
 *
 * The view is drawn afresh, into an element that is never attached, rather than copied
 * off the screen: the picture is then at 1:1 whatever zoom the screen is at, and can be
 * taken from any view. Two things about the drawing do not survive being loaded as an
 * image on its own and are put right first: the chapter icons name the sprite sheet by
 * URL, and an image loads no external resources, so the sheet goes in as a data URL;
 * and the text takes its font from the page, which a standalone image has no access
 * to, so the page's font is written onto it.
 */
export async function captureCityScreenshot(scene: CityScene, frame: TileRect): Promise<Blob> {
  const width = frame.width * GridSize;
  const height = frame.length * GridSize;
  const svg = drawScene(scene, frame);
  svg.querySelectorAll(OMIT_SELECTOR).forEach((el) => el.remove());
  await inlineImages(svg);

  const xml = new XMLSerializer().serializeToString(svg);
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
 * Renders the scene into a detached root, synchronously, and hands back a copy of the
 * SVG that outlives the root. The copy is what gets edited afterwards: React is not
 * told about changes made to elements it manages.
 */
function drawScene(scene: CityScene, frame: TileRect): SVGSVGElement {
  const host = document.createElement('div');
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <CityScreenshotSvg scene={scene} frame={frame} fontFamily={getComputedStyle(document.body).fontFamily} />,
      ),
    );
    const svg = host.querySelector('svg');
    if (!svg) throw new Error('The screenshot drew nothing');
    return svg.cloneNode(true) as SVGSVGElement;
  } finally {
    root.unmount();
  }
}

/**
 * Puts every picture the SVG references inline. Each distinct URL is fetched once
 * and defined once, and the elements that referenced it become uses of that
 * definition: the sprite sheet is referenced by every block with a chapter icon, and
 * a data URL in each of them would put the whole sheet in the file that many times
 * over. A picture that cannot be fetched is left out rather than failing the shot.
 */
async function inlineImages(svg: SVGSVGElement): Promise<void> {
  const images = Array.from(svg.querySelectorAll('image'));
  const hrefs = new Set(
    images
      .map((image) => image.getAttribute('href'))
      .filter((href): href is string => !!href && !href.startsWith('data:')),
  );
  if (hrefs.size === 0) return;

  const defs = svg.ownerDocument.createElementNS(SVG_NS, 'defs');
  svg.prepend(defs);
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
        const use = svg.ownerDocument.createElementNS(SVG_NS, 'use');
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
