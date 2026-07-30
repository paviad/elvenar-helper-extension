import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { useCity } from '../../CityContext';
import { commitDrop } from '../commitDrop';
import { usePanZoom } from '../usePanZoom';
import { handleIsoMouseDownWithZoom } from './handleIsoMouseDown';
import { handleIsoMouseMove } from './handleIsoMouseMove';
import { IsometricBlockRect } from './IsometricBlockRect';
import { createIsoProjection } from './isoProjection';

const darken = (color: string, amount: number) => {
  if (!color.startsWith('#')) return 'gray';
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) - amount;
  const g = ((num >> 8) & 0x00ff) - amount;
  const b = (num & 0x0000ff) - amount;
  return (
    '#' + (0x1000000 + (r < 0 ? 0 : r) * 0x10000 + (g < 0 ? 0 : g) * 0x100 + (b < 0 ? 0 : b)).toString(16).slice(1)
  );
};

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 2.5, 3];

export function IsometricCityGrid() {
  const city = useCity();
  const helper = useHelper();
  const {
    GridSize,
    GridMax,
    blocks,
    unlockedAreas,
    PaddingTiles,
    dragIndex,
    highlightedIds,
    chapter,
    allTypes,
    techSprite,
  } = city;

  // --- Isometric Configuration ---
  // The grid constants are stable, so a projection is only a function of zoom.
  const projectionAt = (z: number) => createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom: z });

  const { containerRef, zoom, panHandlers } = usePanZoom({
    zoomLevels: ZOOM_LEVELS,
    // Re-project the tile under the cursor at the new zoom; unlike the top-down
    // view, iso screen position is not a plain multiple of the zoom.
    anchorScroll: ({ contentX, contentY, mouseX, mouseY, currentZoom, newZoom }) => {
      const { x, y } = projectionAt(currentZoom).fromIso(contentX, contentY);
      const point = projectionAt(newZoom).toIso(x, y);
      return { left: point.x - mouseX, top: point.y - mouseY };
    },
    idleCursor: () => (city.dragIndex !== null ? 'grabbing' : 'default'),
  });
  const { tileWidth, tileHeight, toIso } = projectionAt(zoom);

  const paddedGridMax = GridMax + PaddingTiles * 2;

  // Total Dimensions
  const totalWidth = paddedGridMax * tileWidth + 100;
  // Height must accommodate the bottom half of the diamond plus padding
  const totalHeight = paddedGridMax * tileHeight + 200;

  const renderPolygon = (x: number, y: number, w: number, l: number, fill: string, stroke: string, height = 0) => {
    const p1 = toIso(x, y);
    const p2 = toIso(x + w, y);
    const p3 = toIso(x + w, y + l);
    const p4 = toIso(x, y + l);

    const pathTop = `M${p1.x},${p1.y - height} L${p2.x},${p2.y - height} L${p3.x},${p3.y - height} L${p4.x},${p4.y - height} Z`;
    const pathRight = `M${p2.x},${p2.y - height} L${p3.x},${p3.y - height} L${p3.x},${p3.y} L${p2.x},${p2.y} Z`;
    const pathLeft = `M${p3.x},${p3.y - height} L${p4.x},${p4.y - height} L${p4.x},${p4.y} L${p3.x},${p3.y} Z`;

    return (
      <g>
        {height > 0 && <path d={pathRight} fill={darken(fill, 40)} stroke={stroke} strokeWidth={0.5} />}
        {height > 0 && <path d={pathLeft} fill={darken(fill, 20)} stroke={stroke} strokeWidth={0.5} />}
        <path d={pathTop} fill={fill} stroke={stroke} strokeWidth={1} />
      </g>
    );
  };

  // Kept stable so the memoised blocks are not invalidated by every city change.
  const cityRef = React.useRef(city);
  cityRef.current = city;
  const helperRef = React.useRef(helper);
  helperRef.current = helper;

  const onPickUp = React.useCallback(
    (e: React.MouseEvent<SVGElement, MouseEvent>, blockKey: number) => {
      // See the note in the top-down grid: as a prop this re-rendered every block
      // twice per gesture.
      if (cityRef.current.dragIndex !== null) return;
      handleIsoMouseDownWithZoom(cityRef.current, helperRef.current, e, blockKey, zoom);
    },
    [zoom],
  );

  const onOpenMenu = React.useCallback(
    (e: React.MouseEvent<SVGElement, MouseEvent>, blockKey: number) => {
      const current = cityRef.current;
      const svg = current.svgRef.current;
      const block = current.blocks[blockKey];

      let x = e.clientX;
      let y = e.clientY;

      if (svg && block) {
        const rect = svg.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;

        const blockScreenPos = projectionAt(zoom).toIso(block.x, block.y);
        current.setDragOffset({ x: x - blockScreenPos.x, y: y - blockScreenPos.y });
      }

      current.setMenu({ x, y, key: blockKey });
    },
    [zoom],
  );

  const sortedEntries = React.useMemo(() => {
    return Object.entries(blocks).sort(([, a], [, b]) => {
      const depthA = a.x + a.width + (a.y + a.length);
      const depthB = b.x + b.width + (b.y + b.length);
      return depthA - depthB;
    });
  }, [blocks]);

  const blockShapes = React.useMemo(() => {
    const shapeFor = (blockKey: string | number, block: (typeof blocks)[number]) => (
      <IsometricBlockRect
        key={blockKey}
        blockKey={blockKey}
        block={block}
        zoom={zoom}
        chapter={chapter}
        allTypes={allTypes}
        isHighlighted={highlightedIds.has(block.id)}
        sprite={techSprite}
        onPickUp={onPickUp}
        onOpenMenu={onOpenMenu}
      />
    );

    const resting = sortedEntries
      .filter(([i]) => Number(i) !== dragIndex)
      .map(([i, block]) => shapeFor(Number(i), block));

    // The dragged block is drawn last so it stays above everything it passes over.
    const dragged = dragIndex !== null && blocks[dragIndex] ? [shapeFor('dragged', blocks[dragIndex])] : [];

    return [...resting, ...dragged];
  }, [sortedEntries, blocks, dragIndex, zoom, chapter, allTypes, highlightedIds, techSprite, onPickUp, onOpenMenu]);

  const hasCentered = React.useRef(false);
  React.useEffect(() => {
    if (!hasCentered.current && containerRef.current && totalWidth > 100) {
      containerRef.current.scrollLeft = (totalWidth - containerRef.current.clientWidth) / 2;
      containerRef.current.scrollTop = PaddingTiles * 10;
      hasCentered.current = true;
    }
  }, [totalWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        cursor: 'default',
      }}
      {...panHandlers}
    >
      <svg
        ref={city.svgRef}
        width={totalWidth}
        height={totalHeight}
        style={{
          backgroundColor: '#1a1a2e',
          cursor: city.dragIndex !== null ? 'grabbing' : 'crosshair',
          userSelect: 'none',
          display: 'block',
        }}
        onMouseMove={(e) => handleIsoMouseMove(city, e, zoom)}
        onClick={() => commitDrop(city)}
      >
        {/* Including padding */}
        {renderPolygon(
          -PaddingTiles,
          -PaddingTiles,
          GridMax + PaddingTiles,
          GridMax + PaddingTiles,
          '#27292c',
          'none',
          0,
        )}

        {/* Playable Grid */}
        {renderPolygon(0, 0, GridMax, GridMax, '#145214', 'none', 0)}

        {/* Unlocked Areas */}
        {unlockedAreas.map((area, idx) => {
          const poly = renderPolygon(area.x, area.y, area.width, area.length, 'rgba(255, 255, 255, 0.3)', '#445', 0);
          return <g key={`unlocked-${idx}`}>{poly}</g>;
        })}

        {/* Grid Lines */}
        <g style={{ pointerEvents: 'none', opacity: 0.2 }}>
          {Array.from({ length: GridMax + 1 }).map((_, i) => {
            const startV = toIso(i, 0);
            const endV = toIso(i, GridMax);
            const startH = toIso(0, i);
            const endH = toIso(GridMax, i);
            return (
              <g key={i}>
                <line
                  x1={startV.x}
                  y1={startV.y}
                  x2={endV.x}
                  y2={endV.y}
                  stroke='white'
                  strokeWidth={i % 5 === 0 ? 2 : 1}
                />
                <line
                  x1={startH.x}
                  y1={startH.y}
                  x2={endH.x}
                  y2={endH.y}
                  stroke='white'
                  strokeWidth={i % 5 === 0 ? 2 : 1}
                />
              </g>
            );
          })}
        </g>

        {blockShapes}

        {/* Where a replaced building stood. Click-through, so the replacement can be dropped on it. */}
        {city.replacedArea && (
          <g pointerEvents='none'>
            <animate attributeName='opacity' values='1;0.4;1' dur='1.4s' repeatCount='indefinite' />
            {renderPolygon(
              city.replacedArea.x,
              city.replacedArea.y,
              city.replacedArea.width,
              city.replacedArea.length,
              'rgba(255, 23, 68, 0.45)',
              '#ff1744',
              0,
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
