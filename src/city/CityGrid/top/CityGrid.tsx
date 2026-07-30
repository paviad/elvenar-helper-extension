import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { useCity } from '../../CityContext';
import { GridMax, GridSize, PaddingTiles } from '../../gridConstants';
import { commitDrop } from '../commitDrop';
import { usePanZoom } from '../usePanZoom';
import { BlockRect } from './BlockRect';
import { handleMouseDown } from './handleMouseDown';
import { handleMouseMove } from './handleMouseMove';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CityGrid() {
  const city = useCity();
  const helper = useHelper();
  const { dragIndex, blocks, highlightedIds, chapter, allTypes, techSprite } = city;

  const { containerRef, zoom, panHandlers } = usePanZoom({
    zoomLevels: ZOOM_LEVELS,
    // Content scales uniformly with zoom, so scaling the anchor point is enough.
    anchorScroll: ({ contentX, contentY, mouseX, mouseY, currentZoom, newZoom }) => {
      const ratio = newZoom / currentZoom;
      return { left: contentX * ratio - mouseX, top: contentY * ratio - mouseY };
    },
    idleCursor: () => (dragIndex !== null ? 'grabbing' : 'default'),
  });

  // --- Initial Centering State ---
  const hasCentered = React.useRef(false);

  // Dimension Calculation
  const gridSizePx = GridSize * zoom;
  const gridDimension = gridSizePx * GridMax;
  const paddingPx = PaddingTiles * gridSizePx;
  const totalDimension = gridDimension + paddingPx * 2;

  // Center the view on mount (only once)
  React.useEffect(() => {
    if (!hasCentered.current && containerRef.current && totalDimension > 0) {
      const clientW = containerRef.current.clientWidth;
      if (totalDimension > clientW) {
        containerRef.current.scrollLeft = (totalDimension - clientW) / 2;
        containerRef.current.scrollTop = paddingPx - 10 * gridSizePx; // Adjust to show some of the top area
      }
      hasCentered.current = true;
    }
  }, [totalDimension]);

  // Panning is handled by the hook; the grid also tracks the cursor for drag/drop.
  const onMouseMove = (e: React.MouseEvent) => {
    panHandlers.onMouseMove(e);
    handleMouseMove(city, e, zoom);
  };

  // The blocks are memoised on their props, so their callbacks have to keep a stable
  // identity across renders. Reading the city through a ref keeps them current
  // without making them change every time anything in the city does.
  const cityRef = React.useRef(city);
  cityRef.current = city;
  const helperRef = React.useRef(helper);
  helperRef.current = helper;

  const onPickUp = React.useCallback(
    (e: React.MouseEvent<SVGRectElement, MouseEvent>, blockKey: number) => {
      // Checked here rather than passed to every block: as a prop it changed on drag
      // start and end, re-rendering all of them twice per gesture.
      if (cityRef.current.dragIndex !== null) return;
      handleMouseDown(cityRef.current, helperRef.current, e, blockKey, zoom);
    },
    [zoom],
  );

  const onOpenMenu = React.useCallback(
    (e: React.MouseEvent<SVGRectElement, MouseEvent>, blockKey: number) => {
      const current = cityRef.current;
      const svg = current.svgRef.current;
      const block = current.blocks[blockKey];

      let x = e.clientX;
      let y = e.clientY;

      if (svg && block) {
        const rect = svg.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;

        const sGridSize = GridSize * zoom;
        const paddingPx = PaddingTiles * sGridSize;
        current.setDragOffset({
          x: x - paddingPx - block.x * sGridSize,
          y: y - paddingPx - block.y * sGridSize,
        });
      }

      current.setMenu({ x, y, key: blockKey });
    },
    [zoom],
  );

  const blockRects = React.useMemo(() => {
    // If dragging, render dragged block last (on top)
    const withIndex = Object.entries(blocks);
    const blocksBelowUnmoved = withIndex.filter(
      ([i, b]) => Number(i) !== dragIndex && !b.moved && !highlightedIds.has(b.id),
    );
    const blocksBelow = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.moved && !highlightedIds.has(b.id));
    const blocksHighlighted = withIndex.filter(([i, b]) => Number(i) !== dragIndex && highlightedIds.has(b.id));
    const sortedBlocks = [...blocksBelowUnmoved, ...blocksBelow, ...blocksHighlighted];
    if (dragIndex !== null) {
      const draggedBlock = blocks[dragIndex];
      sortedBlocks.push(['dragged', draggedBlock]);
    }
    return sortedBlocks.map(([index, block]) => (
      <BlockRect
        key={index}
        blockKey={index === 'dragged' ? index : Number(index)}
        block={block}
        zoom={zoom}
        chapter={chapter}
        allTypes={allTypes}
        isHighlighted={highlightedIds.has(block.id)}
        sprite={techSprite}
        onPickUp={onPickUp}
        onOpenMenu={onOpenMenu}
      />
    ));
  }, [blocks, dragIndex, zoom, highlightedIds, chapter, allTypes, techSprite, onPickUp, onOpenMenu]);

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
      onMouseMove={onMouseMove}
    >
      <svg
        ref={city.svgRef}
        width={totalDimension}
        height={totalDimension}
        style={{
          border: '1px solid black',
          cursor: dragIndex !== null ? 'grabbing' : 'default',
          userSelect: 'none',
          display: 'block',
          backgroundColor: '#1a1a2e',
        }}
        onClick={() => commitDrop(city)}
      >
        {/* Shift visual grid by Padding */}
        <g transform={`translate(${paddingPx}, ${paddingPx})`}>
          {/* Main Playable Background (Optional visual aid) */}
          <rect x={0} y={0} width={gridDimension} height={gridDimension} fill='#145214' />

          {city.unlockedAreas.map((area, idx) => (
            <rect
              key={`unlocked-${idx}`}
              x={area.x * gridSizePx}
              y={area.y * gridSizePx}
              width={area.width * gridSizePx}
              height={area.length * gridSizePx}
              fill='rgba(255, 255, 255, 0.3)'
              stroke='green'
              strokeWidth={1}
              pointerEvents='none'
            />
          ))}

          {Array.from({ length: GridMax + 1 }).map((_, i) => (
            <g key={'grid-' + i} style={{ pointerEvents: 'none', opacity: 0.2 }}>
              <line
                x1='0'
                y1={i * gridSizePx}
                x2={gridDimension}
                y2={i * gridSizePx}
                stroke='white'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
              <line
                x1={i * gridSizePx}
                y1='0'
                x2={i * gridSizePx}
                y2={gridDimension}
                stroke='white'
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            </g>
          ))}

          {blockRects}
        </g>
      </svg>
    </div>
  );
}
