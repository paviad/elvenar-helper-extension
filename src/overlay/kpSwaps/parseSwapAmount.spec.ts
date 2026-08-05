import { parseSwapAmount } from './parseSwapAmount';

describe('parseSwapAmount', () => {
  it.each([
    ['60 KP Thread', 60],
    ['40 KP AW swap (give to get)', 40],
    ['30 KP SWAP', 30],
    ['10KP SWAP THREAD - AUGUST', 10],
  ])('reads %s as %i', (subject, amount) => {
    expect(parseSwapAmount(subject)).toEqual({ kind: 'amount', amount });
  });

  it('ignores stray numbers once the subject says KP', () => {
    expect(parseSwapAmount('Thread #2 - 25 KP - 2025')).toEqual({ kind: 'amount', amount: 25 });
  });

  it('accepts a repeated amount as one reading', () => {
    expect(parseSwapAmount('15 KP swap — 15 KP each round')).toEqual({ kind: 'amount', amount: 15 });
  });

  it('is ambiguous when two different KP amounts appear', () => {
    expect(parseSwapAmount('20 KP and 40 KP swap')).toEqual({ kind: 'ambiguous' });
  });

  it('falls back to a lone number when KP is never mentioned', () => {
    expect(parseSwapAmount('50 swap thread')).toEqual({ kind: 'amount', amount: 50 });
  });

  it('is ambiguous when several bare numbers appear and none is a KP amount', () => {
    expect(parseSwapAmount('Swap thread #2 - August 2025')).toEqual({ kind: 'ambiguous' });
  });

  it.each([['AW swap thread'], [''], [undefined]])('finds nothing in %s', (subject) => {
    expect(parseSwapAmount(subject)).toEqual({ kind: 'none' });
  });

  it('requires KP to be its own word', () => {
    // "60 KPI" is not sixty knowledge points; fall back to the lone-number rule instead.
    expect(parseSwapAmount('60 KPI review - 35 KP')).toEqual({ kind: 'amount', amount: 35 });
  });
});
