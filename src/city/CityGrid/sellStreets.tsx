import { CityViewState } from '../CityViewState';

export const sellStreets = (s: CityViewState) => {
  const [_, setBlocks] = s.rBlocks;
  setBlocks((prev) => prev.filter((b) => b.type !== 'street'));
};
