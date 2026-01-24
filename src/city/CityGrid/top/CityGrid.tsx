import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useCity } from '../../CityContext';
import { blockRect } from './blockRect';
import { handleMouseMove } from './handleMouseMove';
import { handleMouseUp } from './handleMouseUp';

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];

export function CityGrid() {
  const city = useCity();
  const { GridSize: baseGridSize, GridMax, dragIndex, blocks } = city;
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Zoom State ---
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pendingScrollUpdate = useRef<{ left: number; top: number } | null>(null);

  // --- Drag-to-Scroll State ---
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const startPan = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // --- Initial Centering State ---
  const hasCentered = useRef(false);

  const totalDimension = baseGridSize * zoom * GridMax;

  // --- Scroll Restoration after Zoom ---
  useLayoutEffect(() => {
    if (pendingScrollUpdate.current && containerRef.current) {
      containerRef.current.scrollLeft = pendingScrollUpdate.current.left;
      containerRef.current.scrollTop = pendingScrollUpdate.current.top;
      pendingScrollUpdate.current = null;
    }
  });

  // Sync ref
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Center the view on mount (only once)
  useEffect(() => {
    if (!hasCentered.current && containerRef.current && totalDimension > 0) {
      const clientW = containerRef.current.clientWidth;
      const clientH = containerRef.current.clientHeight;
      if (totalDimension > clientW) {
        containerRef.current.scrollLeft = (totalDimension - clientW) / 2;
      }
      if (totalDimension > clientH) {
        containerRef.current.scrollTop = (totalDimension - clientH) / 2;
      }
      hasCentered.current = true;
    }
  }, [totalDimension]); // Depend on dimension to retry if it starts at 0

  // --- Handlers ---

  useEffect(() => {
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
        // Fallback closest
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

  const sortedBlocks = useMemo(() => {
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
    return sortedBlocks;
  }, [blocks, dragIndex]);

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
        }}
        onClick={() => handleMouseUp(city)}
      >
        <rect x={0} y={0} width={totalDimension} height={totalDimension} fill='#145214' />

        {city.unlockedAreas.map((area, idx) => (
          <rect
            key={`unlocked-${idx}`}
            x={area.x * baseGridSize * zoom}
            y={area.y * baseGridSize * zoom}
            width={area.width * baseGridSize * zoom}
            height={area.length * baseGridSize * zoom}
            fill='rgba(255, 255, 255, 0.3)'
            stroke='green'
            strokeWidth={1}
            pointerEvents='none'
          />
        ))}

        {Array.from({ length: GridMax }).map((_, i) => (
          <g key={'grid-' + i} style={{ pointerEvents: 'none' }}>
            <line
              x1='0'
              y1={i * baseGridSize * zoom}
              x2={totalDimension}
              y2={i * baseGridSize * zoom}
              stroke='#ffffff80'
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
            <line
              x1={i * baseGridSize * zoom}
              y1='0'
              x2={i * baseGridSize * zoom}
              y2={totalDimension}
              stroke='#ffffff80'
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          </g>
        ))}

        {sortedBlocks.map(([index, block]) => blockRect(Number(index), block, zoom))}
      </svg>
    </div>
  );
}
