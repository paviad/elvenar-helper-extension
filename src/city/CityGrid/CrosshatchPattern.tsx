import React from 'react';

export const TOP_CROSSHATCH_ID = 'block-crosshatch-top';
export const ISO_CROSSHATCH_ID = 'block-crosshatch-iso';

/**
 * The crosshatch worn by highlighted blocks, declared once per grid SVG and shared by
 * every block in it via fill='url(#id)'. userSpaceOnUse at a fixed pitch, so the
 * hatching keeps the same weight at every zoom.
 */
export const CrosshatchPattern: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <pattern id={id} patternUnits='userSpaceOnUse' width='8' height='8' patternTransform='rotate(45)'>
      <line x1='0' y1='0' x2='0' y2='8' stroke='#000' strokeWidth='1' />
      <line x1='4' y1='0' x2='4' y2='8' stroke='#000' strokeWidth='1' />
    </pattern>
  </defs>
);
