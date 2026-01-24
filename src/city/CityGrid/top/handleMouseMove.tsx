import React from 'react';
import { bufferTime, Subject } from 'rxjs';
import { useCity } from '../../CityContext';

// Updated Subject to include zoom
const subject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent; zoom: number }>();
const throttled = subject.pipe(bufferTime(30));

// Updated signature to accept zoom (defaults to 1)
export const handleMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  subject.next({ city, e, zoom });
};

export const subscribeToMouseMove = () => {
  return throttled.subscribe((r) => {
    if (r.length === 0) return;
    const { city, e, zoom } = r[r.length - 1];
    processMouseMove(city, e, zoom);
  });
};

const processMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef } = city;

  // Calculate scaled grid size
  const sGridSize = GridSize * zoom;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const gridX = Math.floor(mouseX / sGridSize);
  const gridY = Math.floor(mouseY / sGridSize);

  if (dragIndex !== null) {
    const newX = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].width, Math.round((mouseX - dragOffset.x) / sGridSize)),
    );
    const newY = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].length, Math.round((mouseY - dragOffset.y) / sGridSize)),
    );

    if (!blocks[dragIndex]) {
      return;
    }

    if (blocks[dragIndex].x === newX && blocks[dragIndex].y === newY) {
      return;
    }

    setBlocks((prev) => {
      if (!prev[dragIndex]) {
        // this is a race condition with keyboard events
        return prev;
      }
      return {
        ...prev,
        [dragIndex]: {
          ...prev[dragIndex],
          x: newX,
          y: newY,
        },
      };
    });

    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
      city.setMouseGridPosition({ x: gridX, y: gridY });
    }
  } else {
    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
      city.setMouseGridPosition({ x: gridX, y: gridY });
    }
  }
};
