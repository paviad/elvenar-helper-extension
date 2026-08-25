import { EXPIRY_COLORS, expiryProgress } from './expiry';

const DAY = 86400;
const NOW = 1_700_000_000_000;
/** A ten-day building with the given number of days still to run. */
const withDaysLeft = (days: number) => expiryProgress(10 * DAY, NOW + days * DAY * 1000, NOW);

describe('expiryProgress', () => {
  it('is null when the lifetime or the end is unknown', () => {
    expect(expiryProgress(undefined, NOW + 1000, NOW)).toBeNull();
    expect(expiryProgress(10 * DAY, undefined, NOW)).toBeNull();
    expect(expiryProgress(0, NOW + 1000, NOW)).toBeNull();
  });

  it('measures the share of the lifetime still to run', () => {
    expect(withDaysLeft(8)!.remaining).toBeCloseTo(0.8);
    expect(withDaysLeft(2.5)!.remaining).toBeCloseTo(0.25);
  });

  it('clamps to the bar: nothing left past expiry, nothing over a full life', () => {
    expect(withDaysLeft(-3)!.remaining).toBe(0);
    expect(withDaysLeft(12)!.remaining).toBe(1);
  });

  it('is green above half, orange from half down to a quarter, red below', () => {
    expect(withDaysLeft(8)!.color).toBe(EXPIRY_COLORS.fresh);
    expect(withDaysLeft(5.01)!.color).toBe(EXPIRY_COLORS.fresh);
    expect(withDaysLeft(5)!.color).toBe(EXPIRY_COLORS.warn);
    expect(withDaysLeft(3)!.color).toBe(EXPIRY_COLORS.warn);
    expect(withDaysLeft(2.5)!.color).toBe(EXPIRY_COLORS.warn);
    expect(withDaysLeft(2.49)!.color).toBe(EXPIRY_COLORS.critical);
    expect(withDaysLeft(0)!.color).toBe(EXPIRY_COLORS.critical);
  });
});
