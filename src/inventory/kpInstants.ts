import { InventoryItem } from '../model/inventoryItem';

const KP_INSTANT_SUBTYPE = /^INS_KP_AW_(\d+)/;

/** KP instants on hand, as knowledge points per instant -> how many of them. */
export function countKpInstants(items: InventoryItem[] | undefined): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const item of items ?? []) {
    const match = item.subtype?.match(KP_INSTANT_SUBTYPE);
    if (match) {
      const kp = parseInt(match[1], 10);
      counts[kp] = (counts[kp] || 0) + item.amount;
    }
  }
  return counts;
}

/** "Have: 5x20, 10x10 (Total: 200)", biggest instants first; "Have: None" when there are none. */
export function describeKpInstants(counts: Record<number, number>): string {
  const held = Object.entries(counts)
    .map(([kp, count]) => ({ kp: parseInt(kp, 10), count }))
    .filter((instant) => instant.count > 0)
    .sort((a, b) => b.kp - a.kp);

  if (held.length === 0) return 'Have: None';

  const total = held.reduce((sum, instant) => sum + instant.kp * instant.count, 0);
  return `Have: ${held.map((instant) => `${instant.count}x${instant.kp}`).join(', ')} (Total: ${total})`;
}
