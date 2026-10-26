import { ChecklistStep } from '../../city/movePlan/checklist';
import { SimCity, Tile } from '../../city/movePlan/rulesSimulator';

export interface MapRect {
  x: number;
  y: number;
  width: number;
  length: number;
}

/** What a map marks on top of the city around it. */
export type Mark =
  /** Where the building to pick up stands now. */
  | { type: 'from'; rect: MapRect }
  /** Where a building goes down, numbered in the order of the drag. */
  | { type: 'to'; rect: MapRect; number?: number }
  | { type: 'place'; rect: MapRect }
  | { type: 'sell'; rect: MapRect }
  | { type: 'sellTile'; tile: Tile }
  | { type: 'layTile'; tile: Tile; end: boolean };

export interface StepMapModel {
  /** The patch of city shown, in tiles. */
  view: MapRect;
  buildings: MapRect[];
  streets: Tile[];
  marks: Mark[];
}

/** The smallest patch shown, so a one-tile step still shows enough around it to be found. */
const MIN_SIDE = 14;
const MARGIN = 3;

const markRects = (marks: Mark[]): MapRect[] =>
  marks.map((m) => ('rect' in m ? m.rect : { x: m.tile.x, y: m.tile.y, width: 1, length: 1 }));

/**
 * The map beside a checklist line: the patch of city the step happens in, with where to pick up
 * and where to put down. Drawn from the city as it stands now, so it matches what the game shows.
 */
export const stepMap = (step: ChecklistStep, city: SimCity): StepMapModel | undefined => {
  const { action } = step;
  const marks: Mark[] = [];
  const at = (id: number) => city.buildings.get(id);

  switch (action.type) {
    case 'chain':
    case 'upgradeAndMove': {
      const first = at(action.drops[0]?.id);
      if (!first) return undefined;
      marks.push({ type: 'from', rect: first });
      action.drops.forEach((drop, index) => {
        const b = at(drop.id);
        if (!b) return;
        // A building handed over by an upgrade goes down at its new size.
        const size =
          action.type === 'upgradeAndMove' && index === 0 ? { width: action.width, length: action.length } : b;
        marks.push({
          type: 'to',
          rect: { x: drop.x, y: drop.y, width: size.width, length: size.length },
          ...(action.drops.length > 1 ? { number: index + 1 } : {}),
        });
      });
      break;
    }
    case 'upgrade': {
      const b = at(action.id);
      if (!b) return undefined;
      marks.push({ type: 'to', rect: { x: b.x, y: b.y, width: action.width, length: action.length } });
      break;
    }
    case 'place':
      marks.push({ type: 'place', rect: action.building });
      break;
    case 'sell': {
      const b = at(action.id);
      if (!b) return undefined;
      marks.push({ type: 'sell', rect: b });
      break;
    }
    case 'sellStreets':
      action.tiles.forEach((tile) => marks.push({ type: 'sellTile', tile }));
      break;
    case 'layRun': {
      const step = { x: Math.sign(action.to.x - action.from.x), y: Math.sign(action.to.y - action.from.y) };
      for (let t = action.from; ; t = { x: t.x + step.x, y: t.y + step.y }) {
        const end = (t.x === action.from.x && t.y === action.from.y) || (t.x === action.to.x && t.y === action.to.y);
        marks.push({ type: 'layTile', tile: t, end });
        if (t.x === action.to.x && t.y === action.to.y) break;
      }
      break;
    }
  }

  const rects = markRects(marks);
  let minX = Math.min(...rects.map((r) => r.x)) - MARGIN;
  let minY = Math.min(...rects.map((r) => r.y)) - MARGIN;
  let maxX = Math.max(...rects.map((r) => r.x + r.width)) + MARGIN;
  let maxY = Math.max(...rects.map((r) => r.y + r.length)) + MARGIN;
  if (maxX - minX < MIN_SIDE) {
    const grow = MIN_SIDE - (maxX - minX);
    minX -= Math.floor(grow / 2);
    maxX += Math.ceil(grow / 2);
  }
  if (maxY - minY < MIN_SIDE) {
    const grow = MIN_SIDE - (maxY - minY);
    minY -= Math.floor(grow / 2);
    maxY += Math.ceil(grow / 2);
  }
  const view = { x: minX, y: minY, width: maxX - minX, length: maxY - minY };

  const inView = (r: MapRect) =>
    r.x < view.x + view.width && r.x + r.width > view.x && r.y < view.y + view.length && r.y + r.length > view.y;
  const buildings = [...city.buildings.values()]
    .filter(inView)
    .map(({ x, y, width, length }) => ({ x, y, width, length }));
  const streets = [...city.streets.keys()]
    .map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    })
    .filter((t) => inView({ ...t, width: 1, length: 1 }));

  return { view, buildings, streets, marks };
};
