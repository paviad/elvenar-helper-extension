import { edgeArrow, panned, toScreen, toTile, withZoomStep, zoomedAbout } from './camera';

const camera = { scale: 0.6, offsetX: 487, offsetY: 179 };

describe('the camera', () => {
  it('puts a tile corner on screen as the game draws it, a tile being 104 x 52 at full size', () => {
    expect(toScreen({ scale: 1, offsetX: 0, offsetY: 0 }, { x: 1, y: 0 })).toEqual({ x: 52, y: 26 });
    expect(toScreen(camera, { x: 10, y: 4 })).toEqual({ x: 487 + 6 * 52 * 0.6, y: 179 + 14 * 26 * 0.6 });
  });

  it('finds the tile under a point, undoing what puts a tile on screen', () => {
    const tile = toTile(camera, toScreen(camera, { x: 23, y: 41 }));

    expect(tile.x).toBeCloseTo(23);
    expect(tile.y).toBeCloseTo(41);
  });

  it('follows a drag: the map moves as far as the mouse', () => {
    expect(toScreen(panned(camera, 30, -12), { x: 5, y: 5 })).toEqual({
      x: toScreen(camera, { x: 5, y: 5 }).x + 30,
      y: toScreen(camera, { x: 5, y: 5 }).y - 12,
    });
  });

  it('zooms about a point, which stays over the same spot of the map', () => {
    const point = { x: 900, y: 400 };
    const zoomed = zoomedAbout(camera, point, 0.8);
    const under = toTile(camera, point);

    expect(zoomed.scale).toBe(0.8);
    expect(toScreen(zoomed, under).x).toBeCloseTo(900);
    expect(toScreen(zoomed, under).y).toBeCloseTo(400);
  });

  it('learns a zoom step once, whatever the small differences between sightings', () => {
    let steps = withZoomStep([], 0.604);
    steps = withZoomStep(steps, 0.61);
    steps = withZoomStep(steps, 0.4);

    expect(steps).toEqual([0.4, 0.604]);
  });
});

describe('an arrow to what is off screen', () => {
  it('is not wanted while the point is on screen', () => {
    expect(edgeArrow({ x: 100, y: 100 }, 1920, 912, 40)).toBeUndefined();
  });

  it('stands just inside the edge, on the way from the centre, pointing out', () => {
    const arrow = edgeArrow({ x: 3000, y: 456 }, 1920, 912, 40)!;

    expect(arrow.at).toEqual({ x: 1880, y: 456 });
    expect(arrow.angle).toBeCloseTo(0);
  });

  it('stops at whichever edge it meets first', () => {
    const arrow = edgeArrow({ x: 960, y: -500 }, 1920, 912, 40)!;

    expect(arrow.at).toEqual({ x: 960, y: 40 });
    expect(arrow.angle).toBeCloseTo(-Math.PI / 2);
  });
});
