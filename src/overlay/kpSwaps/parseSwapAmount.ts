// Reads the KP amount out of a swap thread's subject. Subjects are written by whoever
// started the thread and are wildly inconsistent:
//
//   "60 KP Thread"
//   "40 KP AW swap (give to get)"
//   "30 KP SWAP"
//   "10KP SWAP THREAD - AUGUST"
//
// Anchoring on the "KP" that follows the number is what makes this safe: it ignores stray
// numbers a bare digit scan would trip over (a year, a "#2", "chapter 21"). Only when the
// subject never says "KP" do we fall back to a lone number, which is sound here because the
// caller has already confirmed the thread by matching a "<wonder> please" post of your own.

export type SwapAmount =
  | { kind: 'amount'; amount: number }
  | { kind: 'none' } // no number to be found
  | { kind: 'ambiguous' }; // the subject names more than one candidate amount

const KP_AMOUNT = /(\d+)\s*kp\b/gi;
const ANY_NUMBER = /\d+/g;

function distinct(values: number[]): number[] {
  return [...new Set(values)];
}

export function parseSwapAmount(subject: string | undefined): SwapAmount {
  if (!subject) {
    return { kind: 'none' };
  }

  const kpAmounts = distinct([...subject.matchAll(KP_AMOUNT)].map((m) => parseInt(m[1], 10)));
  if (kpAmounts.length === 1) {
    return { kind: 'amount', amount: kpAmounts[0] };
  }
  // Two different "<n> KP" readings in one subject: we cannot tell which one is the round.
  if (kpAmounts.length > 1) {
    return { kind: 'ambiguous' };
  }

  const numbers = distinct(subject.match(ANY_NUMBER)?.map((n) => parseInt(n, 10)) ?? []);
  if (numbers.length === 1) {
    return { kind: 'amount', amount: numbers[0] };
  }
  return numbers.length > 1 ? { kind: 'ambiguous' } : { kind: 'none' };
}
