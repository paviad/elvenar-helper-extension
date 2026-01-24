import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useCity } from '../../CityContext';
import { IsometricBlockRect } from './IsometricBlockRect';
import { handleIsoMouseMove } from './handleIsoMouseMove';
import { handleIsoMouseUp } from './handleIsoMouseUp';

// Helper to darken colors for the "sides" of the 3D blocks
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

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

export function IsometricCityGrid() {
  const city = useCity();
  const { GridSize, GridMax, blocks, unlockedAreas, setMouseGridPosition } = city;
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Zoom State ---
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1); // Ref for accessing current zoom in event handlers without dependency
  const pendingScrollUpdate = useRef<{ left: number; top: number } | null>(null);

  // --- Drag-to-Scroll State ---
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const startPan = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // --- Isometric Configuration ---
  const tileWidth = GridSize * 1.8 * zoom;
  const tileHeight = GridSize * 0.9 * zoom;

  // Center the grid in the SVG container
  const originX = (GridMax * tileWidth) / 2;
  const originY = 50;

  // --- Coordinate Transforms ---
  const toIso = (x: number, y: number) => {
    return {
      x: originX + (x - y) * (tileWidth / 2),
      y: originY + (x + y) * (tileHeight / 2),
    };
  };

  // Helper: Calculate screen position for a specific zoom level
  // We need this inside onWheel to calculate the "Future" position
  const getIsoPoint = (x: number, y: number, z: number) => {
    const tw = GridSize * 1.8 * z;
    const th = GridSize * 0.9 * z;
    const ox = (GridMax * tw) / 2;
    const oy = 50;
    return {
      x: ox + (x - y) * (tw / 2),
      y: oy + (x + y) * (th / 2),
    };
  };

  // Helper: Get grid coordinates from screen point
  const fromIso = (screenX: number, screenY: number, currentZoom: number) => {
    const tw = GridSize * 1.8 * currentZoom;
    const th = GridSize * 0.9 * currentZoom;
    const ox = (GridMax * tw) / 2;
    const oy = 50;

    const adjX = screenX - ox;
    const adjY = screenY - oy;

    const gy = (adjY / (th / 2) - adjX / (tw / 2)) / 2;
    const gx = (adjY / (th / 2) + adjX / (tw / 2)) / 2;

    return { x: gx, y: gy };
  };

  // --- Rendering Helpers ---

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

  // --- Sorting ---
  const sortedEntries = React.useMemo(() => {
    return Object.entries(blocks).sort(([, a], [, b]) => {
      const depthA = a.x + a.width + (a.y + a.length);
      const depthB = b.x + b.width + (b.y + b.length);
      return depthA - depthB;
    });
  }, [blocks]);

  // --- Scroll Restoration ---
  useLayoutEffect(() => {
    if (pendingScrollUpdate.current && containerRef.current) {
      containerRef.current.scrollLeft = pendingScrollUpdate.current.left;
      containerRef.current.scrollTop = pendingScrollUpdate.current.top;
      // We clear this so manual scrolling works, but only after the render
      pendingScrollUpdate.current = null;
    }
  });

  // --- Event Handlers (Attached via Ref for non-passive wheel) ---

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Read current state from Ref to avoid closure staleness
      const currentZoom = zoomRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Current scroll offset (Use pending if available to handle rapid scrolling)
      const scrollLeft = pendingScrollUpdate.current ? pendingScrollUpdate.current.left : container.scrollLeft;
      const scrollTop = pendingScrollUpdate.current ? pendingScrollUpdate.current.top : container.scrollTop;

      // "World" point (pixel coords inside the zoomed content) under the mouse
      const contentX = scrollLeft + mouseX;
      const contentY = scrollTop + mouseY;

      // 1. Calculate Grid Coordinates under the mouse at the CURRENT zoom level
      // This gives us the stable "anchor point" (e.g. tile 15.5, 12.2)
      const { x: gridX, y: gridY } = fromIso(contentX, contentY, currentZoom);

      // Find current index in discrete levels
      let currentIndex = ZOOM_LEVELS.findIndex((z) => Math.abs(z - currentZoom) < 0.001);
      // Fallback if not exactly on a level
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
      // Scroll Up (Negative Delta) -> Zoom In
      if (e.deltaY < 0) {
        nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
      }
      // Scroll Down (Positive Delta) -> Zoom Out
      else if (e.deltaY > 0) {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      const newZoom = ZOOM_LEVELS[nextIndex];

      if (newZoom !== currentZoom) {
        // 2. Calculate where that SAME Grid Coordinate will be in pixels at the NEW zoom level
        const newPoint = getIsoPoint(gridX, gridY, newZoom);

        // 3. Adjust scroll so that newPoint is at the same mouse position on screen
        // NewScroll = NewPixelPos - MouseOffset
        const newScrollLeft = newPoint.x - mouseX;
        const newScrollTop = newPoint.y - mouseY;

        pendingScrollUpdate.current = { left: newScrollLeft, top: newScrollTop };

        // Update Ref immediately to handle rapid events before render cycle completes
        zoomRef.current = newZoom;
        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const handleMouseMoveWrapper = (e: React.MouseEvent) => {
    // 1. Handle Panning logic
    if (isPanning.current && containerRef.current) {
      const dx = e.clientX - startPan.current.x;
      const dy = e.clientY - startPan.current.y;

      // Threshold check to distinguish Click vs Drag
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
  };

  const handleMouseUpWrapper = () => {
    if (isPanning.current && containerRef.current) {
      isPanning.current = false;
      containerRef.current.style.cursor = city.dragIndex !== null ? 'grabbing' : 'default';
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasPanned.current) {
      e.stopPropagation();
      hasPanned.current = false;
    }
  };

  // Calculate SVG Dimensions
  const totalWidth = GridMax * tileWidth + 100;
  const totalHeight = GridMax * tileHeight + 100;

  // Track if we have performed the initial centering
  const hasCentered = useRef(false);

  // Center the view initially once dimensions are valid and zoom is 1
  useEffect(() => {
    if (!hasCentered.current && containerRef.current && totalWidth > 100) {
      containerRef.current.scrollLeft = (totalWidth - containerRef.current.clientWidth) / 2;
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMoveWrapper}
      onMouseUp={handleMouseUpWrapper}
      onMouseLeave={handleMouseUpWrapper}
      onClickCapture={handleClickCapture}
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
        onClick={() => handleIsoMouseUp(city)}
      >
        {/* 1. Base Grid */}
        {renderPolygon(0, 0, GridMax, GridMax, '#4F5824', 'none', 0)}

        {/* 2. Unlocked Areas */}
        {unlockedAreas.map((area, idx) => {
          const poly = renderPolygon(area.x, area.y, area.width, area.length, '#68742E', '#66722E', 0);
          return <g key={`unlocked-${idx}`}>{poly}</g>;
        })}

        {/* 3. Grid Lines */}
        <g style={{ pointerEvents: 'none', opacity: 0.1 }}>
          {Array.from({ length: GridMax + 1 }).map((_, i) => {
            const startV = toIso(i, 0);
            const endV = toIso(i, GridMax);
            const startH = toIso(0, i);
            const endH = toIso(GridMax, i);
            return (
              <g key={i}>
                <line x1={startV.x} y1={startV.y} x2={endV.x} y2={endV.y} stroke='white' strokeWidth={1} />
                <line x1={startH.x} y1={startH.y} x2={endH.x} y2={endH.y} stroke='white' strokeWidth={1} />
              </g>
            );
          })}
        </g>

        {/* 4. Buildings */}
        {sortedEntries
          .filter(([i]) => Number(i) !== city.dragIndex)
          .map(([i, block]) => IsometricBlockRect(Number(i), block, zoom))}

        {/* 5. Dragged Block */}
        {city.dragIndex !== null &&
          blocks[city.dragIndex] &&
          IsometricBlockRect('dragged', blocks[city.dragIndex], zoom)}
      </svg>
    </div>
  );
}
