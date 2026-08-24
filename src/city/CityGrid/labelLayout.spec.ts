import {
  AVG_GLYPH_ADVANCE_EM,
  ICON_TEXT_GAP_TILES,
  ICON_TILES,
  LABEL_FILL_FRACTION,
  layoutBlockLabel,
  MAX_FONT_TILES,
  STAGE_FONT_RATIO,
} from './labelLayout';

const base = { wantIcon: false, widthTiles: 4, lengthTiles: 4 };

describe('layoutBlockLabel', () => {
  it('caps a short label on a large block at the maximum font size, centred', () => {
    const l = layoutBlockLabel({ ...base, label: '5' });

    expect(l.fontTiles).toBe(MAX_FONT_TILES);
    expect(l.mainX).toBe(0);
    expect(l.mainY).toBe(0);
    expect(l.stage).toBeNull();
    expect(l.icon).toBeNull();
  });

  it('shrinks the font until the text fits the block width', () => {
    const l = layoutBlockLabel({ ...base, widthTiles: 1, lengthTiles: 1, label: '14d' });

    expect(l.fontTiles * 3 * AVG_GLYPH_ADVANCE_EM).toBeCloseTo(1 * LABEL_FILL_FRACTION);
  });

  it('shrinks the font until the text fits the block height', () => {
    const l = layoutBlockLabel({ ...base, widthTiles: 10, lengthTiles: 0.5, label: '5' });

    expect(l.fontTiles).toBeCloseTo(0.5 * LABEL_FILL_FRACTION);
  });

  describe('chapter icon', () => {
    it('shows the icon only when wanted and the block is at least 3x2', () => {
      expect(layoutBlockLabel({ ...base, wantIcon: true, label: '9' }).icon).not.toBeNull();
      expect(layoutBlockLabel({ ...base, wantIcon: true, widthTiles: 2, label: '9' }).icon).toBeNull();
      expect(layoutBlockLabel({ ...base, wantIcon: true, lengthTiles: 1, label: '9' }).icon).toBeNull();
      expect(layoutBlockLabel({ ...base, label: '9' }).icon).toBeNull();
    });

    it('centres the icon and text as one row, icon on the main line', () => {
      const l = layoutBlockLabel({ ...base, wantIcon: true, label: '12' });
      const textW = 2 * AVG_GLYPH_ADVANCE_EM * l.fontTiles;
      const rowWidth = ICON_TILES + ICON_TEXT_GAP_TILES + textW;

      expect(l.icon).not.toBeNull();
      expect(l.icon!.x).toBeCloseTo(-rowWidth / 2);
      // The right edge of the text mirrors the left edge of the icon.
      expect(l.mainX + textW / 2).toBeCloseTo(rowWidth / 2);
      expect(l.icon!.y + l.icon!.size / 2).toBeCloseTo(l.mainY);
    });

    it('reserves width for the icon when sizing the text', () => {
      const noIcon = layoutBlockLabel({ ...base, widthTiles: 3, lengthTiles: 2, label: '999d' });
      const withIcon = layoutBlockLabel({ ...base, wantIcon: true, widthTiles: 3, lengthTiles: 2, label: '999d' });

      expect(withIcon.fontTiles).toBeLessThan(noIcon.fontTiles);
    });
  });

  describe('stage line', () => {
    it('stacks the stage line under the main line, centred as a group', () => {
      const l = layoutBlockLabel({ ...base, label: '7', stage: 3 });

      expect(l.stage).not.toBeNull();
      expect(l.stage!.fontTiles).toBeCloseTo(l.fontTiles * STAGE_FONT_RATIO);
      expect(l.mainY).toBeLessThan(l.stage!.y);
      // Centred: the top of the main line mirrors the bottom of the stage line.
      expect(-(l.mainY - l.fontTiles / 2)).toBeCloseTo(l.stage!.y + l.stage!.fontTiles / 2);
    });

    it('keeps both lines inside the block height', () => {
      const l = layoutBlockLabel({ ...base, lengthTiles: 1, label: '7', stage: 3 });
      const top = l.mainY - l.fontTiles / 2;
      const bottom = l.stage!.y + l.stage!.fontTiles / 2;

      expect(bottom - top).toBeLessThanOrEqual(1 * LABEL_FILL_FRACTION + 1e-9);
    });

    it('lets a wide stage line drive the font size down', () => {
      const l = layoutBlockLabel({ ...base, widthTiles: 2, lengthTiles: 10, label: '7', stage: 12 });

      expect(l.stage!.fontTiles * 'Stage 12'.length * AVG_GLYPH_ADVANCE_EM).toBeLessThanOrEqual(
        2 * LABEL_FILL_FRACTION + 1e-9,
      );
    });
  });
});
