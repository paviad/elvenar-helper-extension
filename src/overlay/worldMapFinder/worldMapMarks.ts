import { Hex, hexCentre } from '../../worldmap/worldMapGeometry';
import { edgeArrow, Point } from '../movePlan/camera/camera';
import { gameCanvas } from '../movePlan/camera/locateCamera';
import { MapPan } from './worldMapTracker';

/**
 * The province being looked for, outlined on the game's own world map, or pointed to by an arrow
 * at the screen's edge while it is out of view. Drawn on a canvas of its own laid over the game's,
 * under the helper's panel, letting every click through.
 */

/** A hex on the game's world map, from its centre to a corner, in page pixels. */
const HEX_SIZE = 115;
const COLOUR = '#fee04c';
/** How far in from the screen's edge the arrow stands, in the canvas's pixels. */
const ARROW_INSET = 150;

let overlay: HTMLCanvasElement | undefined;

const ensureOverlay = () => {
  const game = gameCanvas();
  if (!game) return undefined;
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, { position: 'fixed', pointerEvents: 'none', zIndex: '9998' });
    // A slow pulse, so the mark catches the eye without hiding the province under it. In steps:
    // a smooth one has the browser draw the page anew every frame, and the game's world map then
    // stalls for seconds whenever the mouse crosses it.
    overlay.animate([{ opacity: 1 }, { opacity: 0.38 }, { opacity: 1 }], { duration: 1800, iterations: Infinity });
    document.body.appendChild(overlay);
    overlay.getAnimations().forEach((pulse) => pulse.effect?.updateTiming({ easing: 'steps(4, end)' }));
  }
  const rect = game.getBoundingClientRect();
  Object.assign(overlay.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  if (overlay.width !== game.width || overlay.height !== game.height) {
    overlay.width = game.width;
    overlay.height = game.height;
  }
  return overlay;
};

/**
 * Where a hex's centre is on the game's canvas, in its pixels: the map opens with the player's
 * city in the middle, and has been dragged by `pan` since.
 */
export const hexOnScreen = (hex: Hex, home: Hex, pan: MapPan, width: number, height: number, size: number): Point => {
  const at = hexCentre(hex, size);
  const from = hexCentre(home, size);
  return { x: width / 2 + pan.x + at.x - from.x, y: height / 2 + pan.y + at.y - from.y };
};

/** Shows the province where the map now is, or clears the mark when the map's view is not known. */
export const showProvinceMark = (hex: Hex | undefined, home: Hex | undefined, pan: MapPan | undefined) => {
  const canvas = ensureOverlay();
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!hex || !home || !pan) return;

  // The canvas may hold more pixels than the page shows it at.
  const size = HEX_SIZE * (canvas.width / Math.max(1, canvas.getBoundingClientRect().width));
  const centre = hexOnScreen(hex, home, pan, canvas.width, canvas.height, size);

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centre.x + (size - 4) * Math.cos(angle);
    const y = centre.y + (size - 4) * Math.sin(angle);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(254, 224, 76, 0.15)';
  ctx.fill();
  // A dark line under the bright one, so it shows on any ground.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = COLOUR;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Well inside the edge, clear of the game's bars along the top and the bottom.
  const arrow = edgeArrow(centre, canvas.width, canvas.height, ARROW_INSET);
  if (arrow) {
    ctx.save();
    ctx.translate(arrow.at.x, arrow.at.y);
    ctx.rotate(arrow.angle);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-20, -22);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-20, 22);
    ctx.closePath();
    ctx.fillStyle = COLOUR;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
};

/** Takes the mark off the game, for when nothing is being looked for. */
export const removeProvinceMark = () => {
  overlay?.remove();
  overlay = undefined;
};
