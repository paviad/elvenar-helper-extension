import React from 'react';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MapRect, StepMapModel } from './stepMapModel';

/** How wide the map may be in the panel, in pixels. */
const MAX_WIDTH = 330;

/**
 * The patch of city a step happens in, the way the planner's top-down view draws it: buildings
 * as blocks, streets as lighter squares. Where to pick up is outlined, where to put down is
 * filled, numbered in the order of the drag.
 */
export const StepMap = ({ model }: { model: StepMapModel }) => {
  const theme = useTheme();
  const { view } = model;
  const tile = Math.max(6, Math.min(16, Math.floor(MAX_WIDTH / view.width)));
  const box = (r: MapRect) => ({
    x: (r.x - view.x) * tile,
    y: (r.y - view.y) * tile,
    width: r.width * tile,
    height: r.length * tile,
  });

  const pick = theme.palette.primary.main;
  const sell = theme.palette.error.main;
  const add = theme.palette.success.main;
  const lay = theme.palette.info.main;

  return (
    <svg
      width={view.width * tile}
      height={view.length * tile}
      role='img'
      aria-label='Where this step happens in your city'
      style={{ display: 'block', borderRadius: 4 }}
    >
      <rect width={view.width * tile} height={view.length * tile} fill={theme.palette.background.default} />
      {model.streets.map((t) => (
        <rect key={`s${t.x},${t.y}`} {...box({ ...t, width: 1, length: 1 })} fill={theme.palette.action.selected} />
      ))}
      {model.buildings.map((b) => (
        <rect
          key={`b${b.x},${b.y}`}
          {...box(b)}
          fill={theme.palette.action.disabledBackground}
          stroke={theme.palette.divider}
        />
      ))}
      {model.marks.map((mark, index) => {
        switch (mark.type) {
          case 'from':
            return (
              <rect key={index} {...box(mark.rect)} fill='none' stroke={pick} strokeWidth={2} strokeDasharray='4 3' />
            );
          case 'to': {
            const b = box(mark.rect);
            return (
              <g key={index}>
                <rect {...b} fill={alpha(pick, 0.35)} stroke={pick} strokeWidth={2} />
                {mark.number !== undefined && (
                  <>
                    <circle cx={b.x + b.width / 2} cy={b.y + b.height / 2} r={8} fill={pick} />
                    <text
                      x={b.x + b.width / 2}
                      y={b.y + b.height / 2}
                      textAnchor='middle'
                      dominantBaseline='central'
                      fontSize={11}
                      fontWeight={700}
                      fill={theme.palette.primary.contrastText}
                    >
                      {mark.number}
                    </text>
                  </>
                )}
              </g>
            );
          }
          case 'place':
            return <rect key={index} {...box(mark.rect)} fill={alpha(add, 0.35)} stroke={add} strokeWidth={2} />;
          case 'sell': {
            const b = box(mark.rect);
            return (
              <g key={index} stroke={sell} strokeWidth={2}>
                <rect {...b} fill={alpha(sell, 0.2)} />
                <line x1={b.x} y1={b.y} x2={b.x + b.width} y2={b.y + b.height} />
                <line x1={b.x + b.width} y1={b.y} x2={b.x} y2={b.y + b.height} />
              </g>
            );
          }
          case 'sellTile':
            return <rect key={index} {...box({ ...mark.tile, width: 1, length: 1 })} fill={alpha(sell, 0.7)} />;
          case 'layTile':
            return (
              <rect
                key={index}
                {...box({ ...mark.tile, width: 1, length: 1 })}
                fill={alpha(lay, mark.end ? 0.9 : 0.45)}
                stroke={mark.end ? theme.palette.text.primary : 'none'}
                strokeWidth={mark.end ? 1.5 : 0}
              />
            );
        }
      })}
    </svg>
  );
};
