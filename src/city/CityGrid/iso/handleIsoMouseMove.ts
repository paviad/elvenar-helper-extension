import React from 'react';
import { sampleTime, Subject } from 'rxjs';
import { useCity } from '../../CityContext';
import { setMouseGridPosition } from '../../mouseGridStore';
import { createIsoProjection } from './isoProjection';

// Updated Subject to include zoom
const isoSubject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent; zoom: number }>();
const isoThrottled = isoSubject.pipe(sampleTime(50));

export const handleIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  isoSubject.next({ city, e, zoom });
};

export const subscribeToIsoMouseMove = () => {
  return isoThrottled.subscribe((r) => {
    if (!r) return;
    const { city, e, zoom } = r;
    processIsoMouseMove(city, e, zoom);
  });
};

const processIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef, PaddingTiles } = city;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const projection = createIsoProjection({ GridSize, GridMax, PaddingTiles, zoom });

  /** The tile containing a screen point. */
  const tileAt = (screenX: number, screenY: number) => {
    const { x, y } = projection.fromIso(screenX, screenY);
    return { x: Math.floor(x), y: Math.floor(y) };
  };

  if (dragIndex !== null) {
    if (!blocks[dragIndex]) {
      return;
    }

    const targetScreenX = mouseX - dragOffset.x;
    const targetScreenY = mouseY - dragOffset.y;
    const gridPos = tileAt(targetScreenX, targetScreenY);

    const newX = Math.max(-PaddingTiles, Math.min(GridMax - blocks[dragIndex].width + PaddingTiles, gridPos.x));
    const newY = Math.max(-PaddingTiles, Math.min(GridMax - blocks[dragIndex].length + PaddingTiles, gridPos.y));

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
      setMouseGridPosition({ x: newX, y: newY });
    }
  } else {
    const { x: gridX, y: gridY } = tileAt(mouseX, mouseY);

    if (mouseGrid) {
      if (
        gridX >= -PaddingTiles &&
        gridX < GridMax + PaddingTiles &&
        gridY >= -PaddingTiles &&
        gridY < GridMax + PaddingTiles
      ) {
        // Show coordinate even if negative
        mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
        setMouseGridPosition({ x: gridX, y: gridY });
      } else {
        mouseGrid.innerText = `Grid: -`;
      }
    }
  }
};
