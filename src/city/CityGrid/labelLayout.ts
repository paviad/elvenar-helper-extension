/**
 * Layout of a block's label, computed in TILES: 1 unit = 1 grid tile, origin at the
 * block's centre. Each view places the result with a single translate+scale of its
 * own, so the layout rule is identical in both views by construction and zoom never
 * enters here.
 */

/** A label line never grows taller than one tile. */
export const MAX_FONT_TILES = 1;

/** Estimated average glyph advance, in em; labels are digits and short suffixes. */
export const AVG_GLYPH_ADVANCE_EM = 0.6;

/** The portion of the block's footprint a label may span. */
export const LABEL_FILL_FRACTION = 0.9;

/** The stage line's font size relative to the main line. */
export const STAGE_FONT_RATIO = 0.6;

/** Gap between the main and stage lines, relative to the main font size. */
export const LINE_GAP_RATIO = 0.15;

/** Edge of the chapter icon. */
export const ICON_TILES = 1.2;

/** Gap between the chapter icon and the label text. */
export const ICON_TEXT_GAP_TILES = 0.15;

/**
 * Labels are laid out in tiles but rendered at LABEL_UNITS_PER_TILE user units per
 * tile rather than 1: browsers apply minimum-font-size settings to SVG text on its
 * computed size, before any group transform, so a 0.6-tile font written as 0.6px
 * could be clamped up and drawn enormous. At 16 units a tile the computed sizes are
 * ordinary on-screen magnitudes.
 */
export const LABEL_UNITS_PER_TILE = 16;

export interface BlockLabelLayoutInput {
  label: string;
  stage?: number;
  /** Whether the caller could draw a chapter icon at all (sprite loaded, chapter known). */
  wantIcon: boolean;
  widthTiles: number;
  lengthTiles: number;
}

export interface BlockLabelLayout {
  /** Main line font size. */
  fontTiles: number;
  /** Centre of the main line. */
  mainX: number;
  mainY: number;
  /** The stage line, when there is one; centred on x = 0. */
  stage: { fontTiles: number; y: number } | null;
  /** The chapter icon, when there is room for one; x/y are its top-left corner. */
  icon: { x: number; y: number; size: number } | null;
}

/** Estimated width of a line of text, in tiles. */
const textWidth = (chars: number, fontTiles: number) => chars * AVG_GLYPH_ADVANCE_EM * fontTiles;

export function layoutBlockLabel({
  label,
  stage,
  wantIcon,
  widthTiles,
  lengthTiles,
}: BlockLabelLayoutInput): BlockLabelLayout {
  const showIcon = wantIcon && widthTiles >= 3 && lengthTiles >= 2;
  const stageText = stage ? `Stage ${stage}` : undefined;

  // The font size is whatever lets everything fit: the main line beside its icon, the
  // stage line below it, and both lines within the block's height. There is no lower
  // clamp - a label keeps shrinking with its block rather than overflowing it.
  const fillWidth = widthTiles * LABEL_FILL_FRACTION;
  const fillLength = lengthTiles * LABEL_FILL_FRACTION;
  const mainWidthCap =
    (fillWidth - (showIcon ? ICON_TILES + ICON_TEXT_GAP_TILES : 0)) / textWidth(Math.max(label.length, 1), 1);
  const stageWidthCap = stageText ? fillWidth / textWidth(stageText.length, STAGE_FONT_RATIO) : Infinity;
  const heightCap = stageText ? fillLength / (1 + LINE_GAP_RATIO + STAGE_FONT_RATIO) : fillLength;
  const fontTiles = Math.min(MAX_FONT_TILES, mainWidthCap, stageWidthCap, heightCap);

  // Two lines are centred as a group; a single line sits on the centre itself.
  const groupHeight = stageText ? fontTiles * (1 + LINE_GAP_RATIO + STAGE_FONT_RATIO) : fontTiles;
  const mainY = -groupHeight / 2 + fontTiles / 2;
  const stageLine = stageText
    ? { fontTiles: fontTiles * STAGE_FONT_RATIO, y: groupHeight / 2 - (fontTiles * STAGE_FONT_RATIO) / 2 }
    : null;

  // The icon and the text form one centred row; the icon is centred on the main line.
  const mainTextWidth = textWidth(label.length, fontTiles);
  const rowWidth = showIcon ? ICON_TILES + ICON_TEXT_GAP_TILES + mainTextWidth : mainTextWidth;
  const rowStart = -rowWidth / 2;

  return {
    fontTiles,
    mainX: showIcon ? rowStart + ICON_TILES + ICON_TEXT_GAP_TILES + mainTextWidth / 2 : 0,
    mainY,
    stage: stageLine,
    icon: showIcon ? { x: rowStart, y: mainY - ICON_TILES / 2, size: ICON_TILES } : null,
  };
}
