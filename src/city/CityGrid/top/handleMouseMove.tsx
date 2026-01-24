import React from 'react';
import { useCity } from '../../CityContext';
import { sampleTime, Subject } from 'rxjs';

const subject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent; zoom: number }>();
const throttled = subject.pipe(sampleTime(100));

export const handleMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  subject.next({ city, e, zoom });
};

export const subscribeToMouseMove = () => {
  return throttled.subscribe((r) => {
    if (!r) return;
    const { city, e, zoom } = r;
    processMouseMove(city, e, zoom);
  });
};

const PADDING_TILES = 10;

const processMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef } = city;

  // Calculate scaled grid size
  const sGridSize = GridSize * zoom;
  const paddingPx = PADDING_TILES * sGridSize;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();

  // Adjust mouse position by subtracting the padding
  const mouseX = e.clientX - rect.left - paddingPx;
  const mouseY = e.clientY - rect.top - paddingPx;

  if (dragIndex !== null) {
    const newX = Math.max(
      -PADDING_TILES,
      Math.min(GridMax - blocks[dragIndex].width + PADDING_TILES, Math.round((mouseX - dragOffset.x) / sGridSize)),
    );
    const newY = Math.max(
      -PADDING_TILES,
      Math.min(GridMax - blocks[dragIndex].length + PADDING_TILES, Math.round((mouseY - dragOffset.y) / sGridSize)),
    );

    if (!blocks[dragIndex]) {
      return;
    }

    if (blocks[dragIndex].x === newX && blocks[dragIndex].y === newY) {
      return;
    }

    setBlocks((prev) => {
      if (!prev[dragIndex]) {
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
      mouseGrid.innerText = `Grid: (${newX}, ${newY})`;
      city.setMouseGridPosition({ x: newX, y: newY });
    }
  } else {
    const gridX = Math.floor(mouseX / sGridSize);
    const gridY = Math.floor(mouseY / sGridSize);
    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
      city.setMouseGridPosition({ x: gridX, y: gridY });
    }
  }
};
