import React from 'react';
import { useCity } from '../../CityContext';
import { BlockRect } from './BlockRect';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];
const PADDING_TILES = 10; // Must match handleMouseMove.ts

export function CityGrid() {
  const city = useCity();
  const { GridSize: baseGridSize, GridMax, dragIndex, blocks } = city;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // --- Zoom State ---
  const [zoom, setZoom] = React.useState(1);
  const zoomRef = React.useRef(1);
  const pendingScrollUpdate = React.useRef<{ left: number; top: number } | null>(null);

  // --- Drag-to-Scroll State ---
  const isPanning = React.useRef(false);
  const hasPanned = React.useRef(false);
  const startPan = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // --- Initial Centering State ---
  const hasCentered = React.useRef(false);

  // Create a proxy city object with the scaled GridSize.
  // Dimension Calculation
  const gridSizePx = baseGridSize * zoom;
  const gridDimension = gridSizePx * GridMax;
  const paddingPx = PADDING_TILES * gridSizePx;
  const totalDimension = gridDimension + paddingPx * 2;

  // --- Scroll Restoration after Zoom ---
  React.useLayoutEffect(() => {
    if (pendingScrollUpdate.current && containerRef.current) {
      containerRef.current.scrollLeft = pendingScrollUpdate.current.left;
      containerRef.current.scrollTop = pendingScrollUpdate.current.top;
      pendingScrollUpdate.current = null;
    }
  });

  // Center the view on mount (only once)
  React.useEffect(() => {
    if (!hasCentered.current && containerRef.current && totalDimension > 0) {
      const clientW = containerRef.current.clientWidth;
      if (totalDimension > clientW) {
        containerRef.current.scrollLeft = (totalDimension - clientW) / 2;
      }
      hasCentered.current = true;
    }
  }, [totalDimension]);

  // --- Handlers ---

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = zoomRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scrollLeft = pendingScrollUpdate.current ? pendingScrollUpdate.current.left : container.scrollLeft;
      const scrollTop = pendingScrollUpdate.current ? pendingScrollUpdate.current.top : container.scrollTop;

      // Point in the content (world coordinates) under the mouse
      const contentX = scrollLeft + mouseX;
      const contentY = scrollTop + mouseY;

      // Find current index
      let currentIndex = ZOOM_LEVELS.findIndex((z) => Math.abs(z - currentZoom) < 0.001);
      if (currentIndex === -1) {
        let minDiff = Infinity;
        ZOOM_LEVELS.forEach((z, i) => {
          const diff = Math.abs(z - currentZoom);
          if (diff < minDiff) {
            minDiff = diff;
            currentIndex = i;
          }
        });
      }

      let nextIndex = currentIndex;
      if (e.deltaY < 0) {
        nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
      } else if (e.deltaY > 0) {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      const newZoom = ZOOM_LEVELS[nextIndex];

      if (newZoom !== currentZoom) {
        const ratio = newZoom / currentZoom;
        const newScrollLeft = contentX * ratio - mouseX;
        const newScrollTop = contentY * ratio - mouseY;

        pendingScrollUpdate.current = { left: newScrollLeft, top: newScrollTop };
        zoomRef.current = newZoom;
        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && containerRef.current) {
      isPanning.current = true;
      hasPanned.current = false;
      startPan.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // 1. Handle Panning Logic
    if (isPanning.current && containerRef.current) {
      const dx = e.clientX - startPan.current.x;
      const dy = e.clientY - startPan.current.y;

      if (!hasPanned.current) {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasPanned.current = true;
          containerRef.current.style.cursor = 'grabbing';
        }
      }

      if (hasPanned.current) {
        containerRef.current.scrollLeft = startPan.current.scrollLeft - dx;
        containerRef.current.scrollTop = startPan.current.scrollTop - dy;
      }
    }

    // 2. Pass event to Grid Logic using the zoomed context
    handleMouseMove(city, e, zoom);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isPanning.current && containerRef.current) {
      isPanning.current = false;
      containerRef.current.style.cursor = dragIndex !== null ? 'grabbing' : 'default';
    }
  };

  const onMouseLeave = (e: React.MouseEvent) => {
    if (isPanning.current && containerRef.current) {
      isPanning.current = false;
      containerRef.current.style.cursor = dragIndex !== null ? 'grabbing' : 'default';
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (hasPanned.current) {
      e.stopPropagation();
      hasPanned.current = false;
    }
  };

  const blockRects = React.useMemo(() => {
    // If dragging, render dragged block last (on top)
    const withIndex = Object.entries(blocks);
    const blocksBelowUnmoved = withIndex.filter(([i, b]) => Number(i) !== dragIndex && !b.moved && !b.highlighted);
    const blocksBelow = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.moved && !b.highlighted);
    const blocksHighlighted = withIndex.filter(([i, b]) => Number(i) !== dragIndex && b.highlighted);
    const sortedBlocks = [...blocksBelowUnmoved, ...blocksBelow, ...blocksHighlighted];
    if (dragIndex !== null) {
      const draggedBlock = blocks[dragIndex];
      sortedBlocks.push(['dragged', draggedBlock]);
    }
    return sortedBlocks.map(([index, block]) => BlockRect(index, block, zoom));
  }, [blocks, dragIndex, zoom]);

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
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onClickCapture={onClickCapture}
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
        onClick={() => handleMouseUp(city)}
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
