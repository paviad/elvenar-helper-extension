// Standalone Spire negotiation readout: win probability plus a joker prompt.
// Deliberately not part of the draggable helper panel: the panel is often collapsed
// while negotiating, and this needs to stay readable next to the game canvas.

const BADGE_ID = 'elven-assist-spire-badge';
const PROB_ID = 'elven-assist-spire-badge-prob';
const JOKER_ID = 'elven-assist-spire-badge-joker';
const STATUS_ID = 'elven-assist-spire-badge-status';

export interface SpireBadgeData {
  prob?: string;
  /** 1-based ghost to spend a joker on; absent when a joker is not an option. */
  jokerGhost?: number;
  /** Round these values apply to, shown so stale readings are obvious. */
  turn?: number;
  /** While set, the values below belong to the previous round and are hidden. */
  status?: 'waiting' | 'timeout';
}

const statusText: Record<NonNullable<SpireBadgeData['status']>, string> = {
  waiting: 'waiting for wizard…',
  timeout: 'wizard not responding',
};

const createBadge = () => {
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.style.position = 'fixed';
  badge.style.top = '8px';
  badge.style.right = '8px';
  badge.style.zIndex = '9998'; // just under the helper panel
  badge.style.padding = '6px 12px';
  badge.style.borderRadius = '8px';
  badge.style.background = 'rgba(0, 0, 0, 0.72)';
  badge.style.border = '1px solid rgba(255, 255, 255, 0.25)';
  badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
  badge.style.font = '600 15px/1.35 system-ui, sans-serif';
  badge.style.textAlign = 'center';
  badge.style.userSelect = 'none';
  badge.style.cursor = 'pointer';
  badge.title = 'Spire Wizard — click to dismiss';
  // Clickable so it can be dismissed; the trade-off is that this small area no longer
  // passes clicks through to the game. It reappears on the next update.
  badge.addEventListener('click', () => badge.remove());

  // Separate nodes so each line keeps its own colour. textContent throughout — the
  // probability string comes from an external site and is never treated as markup.
  const probLine = document.createElement('div');
  probLine.id = PROB_ID;
  badge.appendChild(probLine);

  const jokerLine = document.createElement('div');
  jokerLine.id = JOKER_ID;
  jokerLine.style.color = '#74c0fc';
  badge.appendChild(jokerLine);

  const statusLine = document.createElement('div');
  statusLine.id = STATUS_ID;
  badge.appendChild(statusLine);

  document.body.appendChild(badge);
  return badge;
};

export const updateSpireBadge = ({ prob, jokerGhost, turn, status }: SpireBadgeData) => {
  const existing = document.getElementById(BADGE_ID);

  if (!prob && jokerGhost === undefined && !status) {
    existing?.remove();
    return;
  }

  const badge = existing ?? createBadge();
  // Prefix every line rather than adding a header, so the turn is still visible
  // when only one of the lines is showing.
  const prefix = turn === undefined ? '' : `T${turn} `;
  // A status means the wizard has not answered for this round yet, so any probability or
  // joker we still hold is from the previous one — show the status alone rather than stale values.
  const showValues = !status;

  const probLine = badge.querySelector<HTMLDivElement>(`#${PROB_ID}`);
  if (probLine) {
    probLine.textContent = prob ? `${prefix}Win ${formatProb(prob)}` : '';
    probLine.style.color = prob ? probColor(prob) : 'inherit';
    probLine.style.display = showValues && prob ? '' : 'none';
  }

  const jokerLine = badge.querySelector<HTMLDivElement>(`#${JOKER_ID}`);
  if (jokerLine) {
    jokerLine.textContent = jokerGhost === undefined ? '' : `${prefix}🃏 Joker → Ghost ${jokerGhost}`;
    jokerLine.style.display = showValues && jokerGhost !== undefined ? '' : 'none';
  }

  const statusLine = badge.querySelector<HTMLDivElement>(`#${STATUS_ID}`);
  if (statusLine) {
    statusLine.textContent = status ? `${prefix}${statusText[status]}` : '';
    statusLine.style.color = status === 'timeout' ? '#ff8787' : '#ced4da';
    statusLine.style.display = status ? '' : 'none';
  }
};

// The wizard hands us a preformatted string; only add the unit when it lacks one.
const formatProb = (prob: string) => {
  const trimmed = prob.trim();
  return trimmed.endsWith('%') ? trimmed : `${trimmed}%`;
};

const probColor = (prob: string) => {
  const value = parseFloat(prob);
  if (Number.isNaN(value)) {
    return '#ffffff';
  }
  if (value >= 70) {
    return '#69db7c';
  }
  if (value >= 40) {
    return '#ffd43b';
  }
  return '#ff8787';
};
