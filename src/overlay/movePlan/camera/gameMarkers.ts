import { MapRect, Mark } from '../stepMapModel';
import { Camera, edgeArrow, toScreen } from './camera';
import { gameCanvas } from './locateCamera';

/**
 * The current step's marks drawn over the game itself, where the camera puts them: the building
 * to pick up, where it goes, what to sell or vacate. A mark off screen gets an arrow at the edge
 * pointing to it. Drawn on a canvas of its own laid over the game's, under the helper's panel,
 * letting every click through.
 */

const PICK = '#ffe14d';
const DROP = '#4de8ff';
const PLACE = '#6dff6d';
const SELL = '#ff4d4d';

let overlay: HTMLCanvasElement | undefined;
/** What the overlay holds as drawn, to shift it rather than draw it again while the map is dragged. */
let drawn: { marks: Mark[] | undefined; camera: Camera | undefined } = { marks: undefined, camera: undefined };

const ensureOverlay = () => {
  const game = gameCanvas();
  if (!game) return undefined;
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.setAttribute('aria-hidden', 'true');
    // A layer of its own from the start, so the first shift of a drag costs nothing either.
    Object.assign(overlay.style, { position: 'fixed', pointerEvents: 'none', zIndex: '9998', willChange: 'transform' });
    // A slow pulse, so the marks catch the eye without hiding the buildings under them.
    overlay.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 1600, iterations: Infinity });
    document.body.appendChild(overlay);
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

const corners = (camera: Camera, r: MapRect) =>
  [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.length },
    { x: r.x, y: r.y + r.length },
  ].map((t) => toScreen(camera, t));

const rectOf = (mark: Mark): MapRect => ('rect' in mark ? mark.rect : { ...mark.tile, width: 1, length: 1 });

/** The mark the player has to find first: what to pick up, or else whatever the step is about. */
const leading = (marks: Mark[]) => marks.find((m) => m.type === 'from') ?? marks[0];

/**
 * Shows the marks where the camera puts them. While the map is being dragged, the marks already
 * drawn are only shifted along with it, which costs the browser nothing; they are drawn afresh
 * once the drag is over.
 */
export const showMarks = (marks: Mark[] | undefined, camera: Camera | undefined, moving: boolean) => {
  const canvas = ensureOverlay();
  if (!canvas) return;
  const was = drawn.camera;
  if (moving && camera && was && marks === drawn.marks && camera.scale === was.scale) {
    const r = canvas.getBoundingClientRect().width / canvas.width;
    canvas.style.transform = `translate(${(camera.offsetX - was.offsetX) * r}px, ${(camera.offsetY - was.offsetY) * r}px)`;
    return;
  }
  canvas.style.transform = '';
  drawn = { marks, camera };
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!marks?.length || !camera) return;

  const outline = (r: MapRect, colour: string, width: number, dash: number[] = [], fill?: string) => {
    const points = corners(camera, r);
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    // A dark line under the bright one, so it shows on any ground; cheaper than a blurred shadow.
    ctx.setLineDash(dash);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  for (const mark of marks) {
    switch (mark.type) {
      case 'from':
        outline(mark.rect, PICK, 4, [], 'rgba(255, 225, 77, 0.18)');
        break;
      case 'to':
        outline(mark.rect, DROP, 3, [10, 6], 'rgba(77, 232, 255, 0.15)');
        if (mark.number !== undefined) {
          const [n, , s] = corners(camera, mark.rect);
          const centre = { x: (n.x + s.x) / 2, y: (n.y + s.y) / 2 };
          ctx.fillStyle = DROP;
          ctx.beginPath();
          ctx.arc(centre.x, centre.y, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#002833';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(mark.number), centre.x, centre.y);
        }
        break;
      case 'place':
        outline(mark.rect, PLACE, 3, [10, 6], 'rgba(109, 255, 109, 0.15)');
        break;
      case 'sell':
        outline(mark.rect, SELL, 4, [], 'rgba(255, 77, 77, 0.2)');
        break;
      case 'sellTile':
        outline(rectOf(mark), SELL, 2, [], 'rgba(255, 77, 77, 0.55)');
        break;
      case 'spot':
        outline(mark.rect, DROP, 2, [6, 5]);
        break;
    }
  }

  const lead = leading(marks);
  const [n, , s] = corners(camera, rectOf(lead));
  const arrow = edgeArrow({ x: (n.x + s.x) / 2, y: (n.y + s.y) / 2 }, canvas.width, canvas.height, 40);
  if (arrow) {
    ctx.save();
    ctx.translate(arrow.at.x, arrow.at.y);
    ctx.rotate(arrow.angle);
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-14, -16);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-14, 16);
    ctx.closePath();
    ctx.fillStyle = lead.type === 'sell' || lead.type === 'sellTile' ? SELL : PICK;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
};

/** Takes the marks off the game, for when no plan is showing. */
export const removeMarks = () => {
  overlay?.remove();
  overlay = undefined;
  drawn = { marks: undefined, camera: undefined };
};
