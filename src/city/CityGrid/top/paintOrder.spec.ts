import { paintOrder } from './paintOrder';

const block = (id: number, moved = false) => ({ id, moved });
const keys = (order: [string, unknown][]) => order.map(([key]) => key);

describe('paintOrder', () => {
  it('paints unmoved blocks first, then moved ones, then highlighted ones, keeping record order within each', () => {
    const blocks = { 0: block(10, true), 1: block(11), 2: block(12), 3: block(13, true) };
    expect(keys(paintOrder(blocks, new Set([12]), null))).toEqual(['1', '0', '3', '2']);
  });

  it('puts a highlighted block on top even when it has been moved', () => {
    expect(keys(paintOrder({ 0: block(10, true), 1: block(11) }, new Set([10]), null))).toEqual(['1', '0']);
  });

  it('leaves out the block being carried', () => {
    expect(keys(paintOrder({ 0: block(10), 1: block(11) }, new Set(), 0))).toEqual(['1']);
  });
});
