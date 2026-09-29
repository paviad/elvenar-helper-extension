import { InventoryItem } from '../model/inventoryItem';
import { countKpInstants, describeKpInstants } from './kpInstants';

const item = (subtype: string, amount: number): InventoryItem =>
  ({ id: 0, amount, type: 'instant', subtype, changedAt: 0, properties: [] });

describe('countKpInstants', () => {
  it('counts each instant size, adding up rows of the same size', () => {
    const items = [item('INS_KP_AW_20', 3), item('INS_KP_AW_5', 10), item('INS_KP_AW_20', 2)];
    expect(countKpInstants(items)).toEqual({ 20: 5, 5: 10 });
  });

  it('leaves out everything that is not a KP instant', () => {
    const items = [item('INS_KP_AW_10', 1), item('RUNE_SHARD_X', 7), item('X_INS_KP_AW_50', 1)];
    expect(countKpInstants(items)).toEqual({ 10: 1 });
  });

  it('is empty for no inventory', () => {
    expect(countKpInstants(undefined)).toEqual({});
  });
});

describe('describeKpInstants', () => {
  it('lists the biggest instants first, with the total', () => {
    expect(describeKpInstants({ 5: 442, 20: 67, 3: 6 })).toBe('Have: 67x20, 442x5, 6x3 (Total: 3568)');
  });

  it('says None when nothing is held', () => {
    expect(describeKpInstants({})).toBe('Have: None');
    expect(describeKpInstants({ 10: 0 })).toBe('Have: None');
  });
});
