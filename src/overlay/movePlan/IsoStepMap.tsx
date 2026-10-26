import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { loadBuildingSprite, Sprite } from './sprites/buildingSprite';
import { MapBuilding, MapRect, StepMapModel } from './stepMapModel';

/** A tile in the game's own pictures: twice as wide as it is tall. */
const TILE_WIDTH = 104;
const TILE_HEIGHT = 52;
/** Room above the patch for buildings standing tall over their footprint, in picture pixels. */
const HEADROOM = 220;
/** How faint the buildings a step leaves alone are, so the ones it moves stand out. */
const BYSTANDER_OPACITY = 0.2;
/** How wide the map may be in the panel, in pixels. */
const MAX_WIDTH = 330;

/** A tile corner, in the game's picture pixels. */
const corner = (x: number, y: number) => ({ x: ((x - y) * TILE_WIDTH) / 2, y: ((x + y) * TILE_HEIGHT) / 2 });

/** A footprint's outline: top, right, bottom and left corners. */
const outline = (r: MapRect) => [
  corner(r.x, r.y),
  corner(r.x + r.width, r.y),
  corner(r.x + r.width, r.y + r.length),
  corner(r.x, r.y + r.length),
];

/** Back to front: whatever reaches nearer the viewer is drawn later, over what stands behind it. */
const depth = (r: MapRect) => r.x + r.width + r.y + r.length;

/**
 * The patch of city a step happens in, as the game shows it: in perspective, each building drawn
 * with its own picture - faint, unless the step moves, upgrades or sells it. Where a building goes, a faint copy of it stands in the outline it will
 * fill, so the spot reads the way it will look; numbers give the order of a drag. A building
 * whose picture is not to hand is drawn as its outline.
 */
export const IsoStepMap = ({
  model,
  spriteId,
}: {
  model: StepMapModel;
  /** The game id a building is drawn under. */
  spriteId: (kind: string, level: number) => string | undefined;
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<Map<string, Sprite>>(new Map());

  // Every building on the map, and every one shown where it goes.
  const wanted = [
    ...model.buildings,
    ...model.marks.flatMap((m) => (m.type === 'to' || m.type === 'place' ? [m.rect] : [])),
  ];
  const ids = [...new Set(wanted.map((b) => spriteId(b.kind, b.level)).filter((id) => id !== undefined))];
  const idsKey = ids.join('|');

  useEffect(() => {
    let live = true;
    void Promise.all(ids.map(async (id) => [id, await loadBuildingSprite(id)] as const)).then((loaded) => {
      if (!live) return;
      setSprites(new Map(loaded.filter((e): e is readonly [string, Sprite] => e[1] !== undefined)));
    });
    return () => {
      live = false;
    };
    // The ids are what matter; the list is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const { view } = model;
  const left = corner(view.x, view.y + view.length).x;
  const right = corner(view.x + view.width, view.y).x;
  const top = corner(view.x, view.y).y - HEADROOM;
  const bottom = corner(view.x + view.width, view.y + view.length).y;
  const scale = MAX_WIDTH / (right - left);
  const width = Math.round((right - left) * scale);
  const height = Math.round((bottom - top) * scale);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const px = (p: { x: number; y: number }) => ({ x: (p.x - left) * scale, y: (p.y - top) * scale });
    const path = (r: MapRect) => {
      context.beginPath();
      outline(r).forEach((p, i) => (i ? context.lineTo(px(p).x, px(p).y) : context.moveTo(px(p).x, px(p).y)));
      context.closePath();
    };
    const fill = (r: MapRect, colour: string) => {
      path(r);
      context.fillStyle = colour;
      context.fill();
    };
    const stroke = (r: MapRect, colour: string, lineWidth: number, dash: number[] = []) => {
      path(r);
      context.setLineDash(dash);
      context.strokeStyle = colour;
      context.lineWidth = lineWidth;
      context.stroke();
      context.setLineDash([]);
    };
    const drawBuilding = (b: MapBuilding, opacity = 1) => {
      const id = spriteId(b.kind, b.level);
      const sprite = id ? sprites.get(id) : undefined;
      if (!sprite) {
        fill(b, alpha(theme.palette.text.primary, 0.18 * opacity));
        stroke(b, theme.palette.divider, 1);
        return;
      }
      const anchor = px(corner(b.x, b.y));
      context.globalAlpha = opacity;
      context.drawImage(
        sprite.image,
        anchor.x - sprite.anchorX * scale,
        anchor.y - sprite.anchorY * scale,
        sprite.image.width * scale,
        sprite.image.height * scale,
      );
      context.globalAlpha = 1;
    };

    context.clearRect(0, 0, width, height);
    context.fillStyle = theme.palette.background.default;
    context.fillRect(0, 0, width, height);
    fill(view, alpha(theme.palette.success.main, 0.08));
    for (const t of model.streets) fill({ ...t, width: 1, length: 1 }, alpha(theme.palette.text.primary, 0.12));
    for (const b of [...model.buildings].sort((p, q) => depth(p) - depth(q) || p.x - q.x)) {
      drawBuilding(b, b.involved ? 1 : BYSTANDER_OPACITY);
    }

    const pick = theme.palette.primary.main;
    for (const mark of model.marks) {
      switch (mark.type) {
        case 'from':
          stroke(mark.rect, pick, 2, [6, 4]);
          break;
        case 'to':
        case 'place': {
          const colour = mark.type === 'to' ? pick : theme.palette.success.main;
          fill(mark.rect, alpha(colour, 0.25));
          drawBuilding(mark.rect, 0.55);
          stroke(mark.rect, colour, 2);
          if (mark.type === 'to' && mark.number !== undefined) {
            const [n, , s] = outline(mark.rect).map(px);
            const centre = { x: (n.x + s.x) / 2, y: (n.y + s.y) / 2 };
            context.fillStyle = pick;
            context.beginPath();
            context.arc(centre.x, centre.y, 9, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = theme.palette.primary.contrastText;
            context.font = 'bold 11px sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(String(mark.number), centre.x, centre.y);
          }
          break;
        }
        case 'sell':
          fill(mark.rect, alpha(theme.palette.error.main, 0.35));
          stroke(mark.rect, theme.palette.error.main, 2);
          break;
        case 'sellTile':
          fill({ ...mark.tile, width: 1, length: 1 }, alpha(theme.palette.error.main, 0.7));
          break;
        case 'layTile':
          fill({ ...mark.tile, width: 1, length: 1 }, alpha(theme.palette.info.main, mark.end ? 0.9 : 0.5));
          if (mark.end) stroke({ ...mark.tile, width: 1, length: 1 }, theme.palette.text.primary, 1.5);
          break;
      }
    }
  }, [model, sprites, spriteId, theme, left, top, scale, width, height, view]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role='img'
      aria-label='Where this step happens in your city'
      style={{ display: 'block', borderRadius: 4 }}
    />
  );
};
