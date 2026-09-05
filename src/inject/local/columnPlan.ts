// What a column operation is, shared by the page that runs it and the overlay that shows it: the
// two operations, the two directions, the phases, the messages each side sends the other, and the
// arithmetic of a line of buildings.
//
// Nothing here touches the game or the DOM - that is `column.ts` - so it can be exercised as plain
// functions from either bundle.

export type ColumnPhase = 'idle' | 'armed' | 'captured' | 'running';

/** Fill: more of a hand-placed building after it. Sell: the identical buildings after a hand-sold one. */
export type ColumnMode = 'fill' | 'sell';

/** Which way a run goes from the hand-placed or hand-sold building: down the map (+y) or across it (+x). */
export type ColumnDirection = 'down' | 'across';

export interface ColumnRefund {
  id: string;
  amount: number;
}

/** The building placed or sold by hand, as picked up, and what the line from it holds. */
export interface ColumnCapture {
  mode: ColumnMode;
  /** The direction the count below was taken in. */
  direction: ColumnDirection;
  name: string;
  level: number;
  configId: string;
  x: number;
  y: number;
  width: number;
  length: number;
  /** How far a run can go: copies that fit (fill), or identical buildings in a row (sell). */
  available: number;
  /** Sell: how many of those are mid-production or holding a finished product. */
  producing?: number;
  /** Sell: what one sale refunds. */
  refund?: ColumnRefund[];
}

export interface ColumnLogEntry {
  at: number;
  text: string;
}

export interface ColumnState {
  phase: ColumnPhase;
  /** What it is armed for; absent while off. */
  mode?: ColumnMode;
  /** Which way the next run goes. Kept across armings; set once from the city's race. */
  direction: ColumnDirection;
  capture?: ColumnCapture;
  /** How many the run has done so far, and how many it was asked for. */
  done: number;
  target?: number;
  /** How the last run ended, kept until the next arming. */
  reason?: string;
  /** Newest first. */
  log: ColumnLogEntry[];
}

export type ColumnAction =
  | { action: 'arm'; mode: ColumnMode }
  | { action: 'disarm' }
  /** Which way to go. A picked-up building is counted again the new way; a running run is left alone. */
  | { action: 'direction'; direction: ColumnDirection }
  /** No count means the whole run: as far as the space allows, or every identical building. */
  | { action: 'run'; count?: number; sellProducing?: boolean }
  | { action: 'stop' }
  /** Have the page say where it has got to - for an overlay panel built after it last spoke. */
  | { action: 'query' };

export interface ColumnMessage {
  type: 'column';
  payload: ColumnAction;
}

export interface ColumnStateMessage {
  type: 'columnState';
  payload: ColumnState;
}

export const emptyColumnState = (): ColumnState => ({ phase: 'idle', direction: 'down', done: 0, log: [] });

/** Down for a human city, across for an elven one - the way each race's blocks tend to lie. */
export const defaultDirection = (race: string | undefined): ColumnDirection =>
  race?.toLowerCase() === 'elves' ? 'across' : 'down';

/** Where the run goes, as it reads after "more fit" or "placed": below, or to the right of. */
export const beside = (direction: ColumnDirection) => (direction === 'down' ? 'below' : 'to the right of');

/** The building types a fill repeats: workshops (`production`) and manufactories (`goods`). */
const FILLABLE_TYPES = ['production', 'goods'];

export const isFillable = (type: string) => FILLABLE_TYPES.includes(type);

/** The interaction mode the city is in when the player is doing nothing in particular. */
export const DEFAULT_MODE = 'ModeTypes/defaultMode';

/** Where the game leaves you after a hand sale, so a sell run expects it. */
export const SELL_MODE = 'ModeTypes/sellMode';

/**
 * The attribute the Build/Sell view puts on its root, and the page looks for before every step: the
 * overlay is a plain element in the page's own document, so the page can see for itself whether the
 * tab is selected and the panel open, and needs no message from the overlay to know it is gone.
 */
export const COLUMN_VIEW_MARKER = 'data-elvenassist-column-view';

/** A ceiling on how far a line ever reaches, well past the edge of any city. */
export const MAX_COLUMN = 200;

export interface Footprint {
  x: number;
  y: number;
  width: number;
  length: number;
}

/** The tile the copy `index` steps from `start` goes on: one footprint per step, down or across. */
export const nextTile = (start: Footprint, direction: ColumnDirection, index: number) =>
  direction === 'down'
    ? { x: start.x, y: start.y + start.length * (index + 1) }
    : { x: start.x + start.width * (index + 1), y: start.y };

/**
 * What sits in a straight line from `start`, one footprint at a time, for as long as `at` finds
 * something there. The first miss ends it: a gap is a stop rather than something to skip over, so
 * what a whole-line run touches can be read off the city.
 */
export const columnAlong = <T>(
  start: Footprint,
  direction: ColumnDirection,
  at: (x: number, y: number) => T | undefined,
): T[] => {
  const found: T[] = [];
  while (found.length < MAX_COLUMN) {
    const tile = nextTile(start, direction, found.length);
    const item = at(tile.x, tile.y);
    if (item === undefined) {
      break;
    }
    found.push(item);
  }
  return found;
};

/** How many more copies of `start` fit in a line from it, stopping at the first tile that is taken. */
export const countFits = (
  start: Footprint,
  direction: ColumnDirection,
  canPlace: (x: number, y: number, width: number, length: number) => boolean,
) => columnAlong(start, direction, (x, y) => (canPlace(x, y, start.width, start.length) ? true : undefined)).length;

/** Entity state ids (rev-eng/09 §2.3) a sale must leave alone, and the ones a product would be lost from. */
const UNSELLABLE_STATES = ['construction', 'upgrading', 'pre_construction', 'pre_upgrading'];
const PRODUCING_STATES = ['production', 'finished', 'waiting'];

export const isProducing = (stateId: string) => PRODUCING_STATES.includes(stateId);

/** Why a building in this state must not be sold now, as the end of a sentence, or nothing. */
export const sellObstacle = (stateId: string, sellProducing: boolean): string | undefined => {
  if (UNSELLABLE_STATES.includes(stateId)) {
    return 'is under construction';
  }
  if (!sellProducing && isProducing(stateId)) {
    return 'is producing';
  }
  return undefined;
};
