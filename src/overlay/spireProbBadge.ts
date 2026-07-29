// Standalone win-probability readout for Spire negotiations.
// Deliberately not part of the draggable helper panel: the panel is often collapsed
// while negotiating, and this needs to stay readable next to the game canvas.

const BADGE_ID = 'elven-assist-spire-prob';

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
  badge.style.font = '600 15px/1.2 system-ui, sans-serif';
  badge.style.textAlign = 'center';
  badge.style.userSelect = 'none';
  badge.style.cursor = 'pointer';
  // Clickable so it can be dismissed; the trade-off is that this small area no longer
  // passes clicks through to the game. It reappears on the next probability update.
  badge.addEventListener('click', () => badge.remove());
  document.body.appendChild(badge);
  return badge;
};

export const updateSpireProbBadge = (prob?: string) => {
  const existing = document.getElementById(BADGE_ID);

  if (!prob) {
    existing?.remove();
    return;
  }

  const badge = existing ?? createBadge();
  badge.style.color = probColor(prob);
  badge.textContent = `Win ${formatProb(prob)}`;
  badge.title = 'Spire Wizard win probability — click to dismiss';
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
