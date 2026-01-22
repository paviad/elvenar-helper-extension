import React from 'react';
import { useCity } from '../CityContext';
import { bufferTime, Subject } from 'rxjs';

const subject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent }>();
const throttled = subject.pipe(bufferTime(30));

export const handleMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent) => {
  subject.next({ city, e });
};

export const subscribeToMouseMove = () => {
  return throttled.subscribe((r) => {
    if (r.length === 0) return;
    const { city, e } = r[r.length - 1];
    processMouseMove(city, e);
  });
};

const processMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef } = city;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  if (dragIndex !== null) {
    const newX = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].width, Math.round((mouseX - dragOffset.x) / GridSize)),
    );
    const newY = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].length, Math.round((mouseY - dragOffset.y) / GridSize)),
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
      mouseGrid.innerText = `Grid: (${newX}, ${newY})`;
    }
  } else {
    const gridX = Math.floor(mouseX / GridSize);
    const gridY = Math.floor(mouseY / GridSize);
    if (mouseGrid) {
      mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
    }
  }
};
