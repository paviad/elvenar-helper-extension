import { ColumnAction, ColumnState, ColumnStateMessage, emptyColumnState } from '../inject/local/columnPlan';
import { relayToGame } from '../inject/relayToGame';

/**
 * Where the column run has got to, as the page last reported it.
 *
 * The run itself lives in the page - it needs the game's dispatcher and engine, which belong to
 * the page's world - so this is only ever a view of what it last said. Nothing until it has
 * spoken; a panel built later asks with a `query`.
 */
let latest: ColumnState = emptyColumnState();

const listeners = new Set<(state: ColumnState) => void>();

export const getColumnState = () => latest;

export const subscribeToColumn = (listener: (state: ColumnState) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setupColumnListener = () => {
  window.addEventListener('message', (event: MessageEvent<ColumnStateMessage>) => {
    if (event.source !== window || event.data?.type !== 'columnState') {
      return;
    }
    latest = event.data.payload;
    listeners.forEach((listener) => listener(latest));
  });
};

export const sendColumn = (action: ColumnAction) => relayToGame('column', action);
