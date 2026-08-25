import { ExpansionSize, GridMax } from '../gridConstants';
import { screenshotFrame } from './screenshotFrame';

const expansion = (cx: number, cy: number) => ({
  x: cx * ExpansionSize,
  y: cy * ExpansionSize,
  width: ExpansionSize,
  length: ExpansionSize,
});
const wholeGrid = { x: 0, y: 0, width: GridMax, length: GridMax };

describe('screenshotFrame', () => {
  it('frames the whole grid when there is nothing to fit to', () => {
    expect(screenshotFrame([], [])).toEqual(wholeGrid);
  });

  it('surrounds the unlocked area with one band of expansions', () => {
    expect(screenshotFrame([expansion(4, 4)], [])).toEqual({ x: 15, y: 15, width: 15, length: 15 });
  });

  it('spans every unlocked area', () => {
    expect(screenshotFrame([expansion(4, 4), expansion(7, 5)], [])).toEqual({ x: 15, y: 15, width: 30, length: 20 });
  });

  it('stops at the edge of the grid', () => {
    expect(screenshotFrame([expansion(0, 0)], [])).toEqual({ x: 0, y: 0, width: 10, length: 10 });
  });

  it('shows a city that has grown to every edge grid and all', () => {
    expect(screenshotFrame([wholeGrid], [])).toEqual(wholeGrid);
  });

  it('takes in a building standing outside the unlocked area, squared out to whole expansions', () => {
    expect(screenshotFrame([expansion(4, 4)], [{ x: 33, y: 21, width: 3, length: 2 }])).toEqual({
      x: 15,
      y: 15,
      width: 30,
      length: 15,
    });
  });

  it('fits to the buildings alone when nothing is unlocked', () => {
    expect(screenshotFrame([], [{ x: 23, y: 21, width: 3, length: 2 }])).toEqual({
      x: 15,
      y: 15,
      width: 20,
      length: 15,
    });
  });

  it('leaves out blocks parked in the scratch space around the grid', () => {
    const parked = [
      { x: -10, y: -10, width: 4, length: 4 },
      { x: GridMax + 2, y: 40, width: 2, length: 2 },
    ];
    expect(screenshotFrame([expansion(8, 8)], parked)).toEqual({ x: 35, y: 35, width: 15, length: 15 });
  });

  it('counts a block overhanging the edge of the grid for the part on it', () => {
    expect(screenshotFrame([], [{ x: 78, y: 40, width: 4, length: 2 }])).toEqual({
      x: 70,
      y: 35,
      width: 10,
      length: 15,
    });
  });
});
