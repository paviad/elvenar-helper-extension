import React from 'react';
import { useHelper } from '../../../helper/HelperContext';
import { useCity } from '../../CityContext';
import { ExpansionSize, GridMax, GridSize, PaddingTiles } from '../../gridConstants';
import { commitDrop } from '../commitDrop';
import { unlockExpansion } from '../unlockExpansion';
import { usePanZoom } from '../usePanZoom';
import { BlockRect } from './BlockRect';
import { handleMouseDown } from './handleMouseDown';
import { handleMouseMove } from './handleMouseMove';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CityGrid() {
  const city = useCity();
  const helper = useHelper();
  const { dragIndex, blocks, highlightedIds, chapter, allTypes, techSprite, unlockAreaMode, unlockedAreas } = city;

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

  // --- Unlock Area mode ---
  const [hoveredLockedCell, setHoveredLockedCell] = React.useState<{ cx: number; cy: number } | null>(null);

  // The grid is a lattice of ExpansionSize x ExpansionSize cells; a cell with any
  // tile outside every unlocked area is still locked and can be unlocked.
  const lockedCells = React.useMemo(() => {
    const covered = new Set<string>();
    unlockedAreas.forEach((area) => {
      for (let x = area.x; x < area.x + area.width; x++) {
        for (let y = area.y; y < area.y + area.length; y++) {
          covered.add(`${x},${y}`);
        }
      }
    });
    const isUnlocked = (cx: number, cy: number) => {
      for (let dx = 0; dx < ExpansionSize; dx++) {
        for (let dy = 0; dy < ExpansionSize; dy++) {
          if (!covered.has(`${cx * ExpansionSize + dx},${cy * ExpansionSize + dy}`)) return false;
        }
      }
      return true;
    };
    const cells: { cx: number; cy: number }[] = [];
    const cellsPerSide = GridMax / ExpansionSize;
    for (let cx = 0; cx < cellsPerSide; cx++) {
      for (let cy = 0; cy < cellsPerSide; cy++) {
        if (!isUnlocked(cx, cy)) cells.push({ cx, cy });
      }
    }
    return cells;
  }, [unlockedAreas]);

  const lockedCellSet = React.useMemo(() => new Set(lockedCells.map((c) => `${c.cx},${c.cy}`)), [lockedCells]);

  const { setUnlockAreaMode } = city;
  React.useEffect(() => {
    if (!unlockAreaMode) {
      setHoveredLockedCell(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUnlockAreaMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlockAreaMode, setUnlockAreaMode]);

  // Right-clicking a locked expansion offers to unlock it, without arming the mode
  // first. A block's own context menu bubbles up preventDefault-ed, so it wins.
  const onSvgContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.defaultPrevented || city.dragIndex !== null) return;
    const svg = city.svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = Math.floor((x - paddingPx) / (gridSizePx * ExpansionSize));
    const cy = Math.floor((y - paddingPx) / (gridSizePx * ExpansionSize));
    if (!lockedCellSet.has(`${cx},${cy}`)) return;
    e.preventDefault();
    city.setMenu({ key: `locked:${cx},${cy}`, x, y });
  };

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

  // Bring a freshly marked replacement footprint into the middle of the viewport.
  // Assigning an out-of-range scroll offset is clamped by the browser, so a footprint
  // near the edge of the map ends up as close to centred as it can get.
  const { replacedArea } = city;
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !replacedArea) return;

    const centerX = paddingPx + (replacedArea.x + replacedArea.width / 2) * gridSizePx;
    const centerY = paddingPx + (replacedArea.y + replacedArea.length / 2) * gridSizePx;
    container.scrollLeft = centerX - container.clientWidth / 2;
    container.scrollTop = centerY - container.clientHeight / 2;
    // Suppress the one-off mount centring, which would otherwise fight this.
    hasCentered.current = true;
  }, [replacedArea]);

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
        onContextMenu={onSvgContextMenu}
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

          {/* Where a replaced building stood. Click-through, so the replacement can be dropped on it. */}
          {city.replacedArea && (
            <g pointerEvents='none'>
              <animate attributeName='opacity' values='1;0.4;1' dur='1.4s' repeatCount='indefinite' />
              <rect
                x={city.replacedArea.x * gridSizePx}
                y={city.replacedArea.y * gridSizePx}
                width={city.replacedArea.width * gridSizePx}
                height={city.replacedArea.length * gridSizePx}
                fill='#ff1744'
                fillOpacity={0.35}
                stroke='#ff1744'
                strokeWidth={3}
                strokeDasharray='6 4'
              />
            </g>
          )}

          {/* Unlock Area mode: shade the locked expansions and let the user pick one. */}
          {unlockAreaMode &&
            lockedCells.map(({ cx, cy }) => {
              const isHovered = hoveredLockedCell?.cx === cx && hoveredLockedCell?.cy === cy;
              return (
                <rect
                  key={`locked-${cx}-${cy}`}
                  x={cx * ExpansionSize * gridSizePx}
                  y={cy * ExpansionSize * gridSizePx}
                  width={ExpansionSize * gridSizePx}
                  height={ExpansionSize * gridSizePx}
                  fill={isHovered ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.35)'}
                  stroke={isHovered ? 'gold' : 'none'}
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredLockedCell({ cx, cy })}
                  onMouseLeave={() => setHoveredLockedCell(null)}
                  onClick={() => unlockExpansion(city, cx, cy)}
                />
              );
            })}
        </g>
      </svg>
    </div>
  );
}
