import { PendingRequest } from '../../model/kpSwap';
import { roomLeftFor } from './roomLeftFor';

const progress = { baseName: 'A_Abyss', invested: 30, required: 175 };

const pending = (overrides: Partial<PendingRequest> = {}): PendingRequest => ({
  threadId: 't1',
  requestedWonder: 'Golden Abyss',
  amount: 60,
  ...overrides,
});

describe('roomLeftFor', () => {
  it('reports what the game says when nothing is outstanding', () => {
    expect(roomLeftFor(progress, [], 'Golden Abyss')).toBe(145);
  });

  it('takes off the requests still awaiting payment', () => {
    expect(roomLeftFor(progress, [pending(), pending({ threadId: 't2', amount: 40 })], 'Golden Abyss')).toBe(45);
  });

  it('ignores requests for other wonders', () => {
    expect(roomLeftFor(progress, [pending({ requestedWonder: 'Martial Monastery' })], 'Golden Abyss')).toBe(145);
  });

  it('bottoms out at no room rather than going negative', () => {
    expect(roomLeftFor({ ...progress, required: 40 }, [pending()], 'Golden Abyss')).toBe(0);
  });

  it('says nothing when the game has said nothing about the wonder', () => {
    expect(roomLeftFor(undefined, [pending()], 'Golden Abyss')).toBeUndefined();
  });

  // The point of deriving rather than counting down: the payer's post retires the request and
  // lifts the invested total by the same amount, so the answer does not move.
  it('holds steady across the moment of payment', () => {
    const beforePayment = roomLeftFor(progress, [pending()], 'Golden Abyss');
    const afterPayment = roomLeftFor({ ...progress, invested: 90 }, [], 'Golden Abyss');

    expect(beforePayment).toBe(85);
    expect(afterPayment).toBe(85);
  });
});
