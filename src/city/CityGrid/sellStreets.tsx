import { CityViewState } from '../CityViewState';

export const sellStreets = (s: CityViewState) => {
  const [_, setBlocks] = s.rBlocks;
  setBlocks((prev) => Object.fromEntries(Object.entries(prev).filter(([_, b]) => b.type !== 'street')));
};
