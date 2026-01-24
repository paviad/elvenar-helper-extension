import React from 'react';
import { useCity } from '../../CityContext';
import { bufferTime, Subject } from 'rxjs';

// Updated Subject to include zoom
const isoSubject = new Subject<{ city: ReturnType<typeof useCity>; e: React.MouseEvent; zoom: number }>();
const isoThrottled = isoSubject.pipe(bufferTime(30));

// Updated signature to accept zoom
export const handleIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  isoSubject.next({ city, e, zoom });
};

export const subscribeToIsoMouseMove = () => {
  return isoThrottled.subscribe((r) => {
    if (r.length === 0) return;
    const { city, e, zoom } = r[r.length - 1];
    processIsoMouseMove(city, e, zoom);
  });
};

const processIsoMouseMove = (city: ReturnType<typeof useCity>, e: React.MouseEvent, zoom: number) => {
  const blocks = city.blocks;
  const setBlocks = city.setBlocks;

  const dragIndex = city.dragIndex;
  const dragOffset = city.dragOffset;

  const { GridSize, svgRef, GridMax, mousePositionRef } = city;

  const svg = svgRef.current;
  if (!svg) return;
  const mouseGrid = mousePositionRef.current;
  const rect = svg.getBoundingClientRect();
  
  // Raw screen coordinates relative to SVG
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // --- Isometric Constants (Must match IsometricCityGrid) ---
  // Apply zoom to tile dimensions
  const tileWidth = GridSize * 1.8 * zoom;
  const tileHeight = GridSize * 0.9 * zoom;
  const originX = (GridMax * tileWidth) / 2;
  const originY = 50;

  // --- Coordinate Transformation Helper ---
  const fromIso = (screenX: number, screenY: number) => {
    const adjX = screenX - originX;
    const adjY = screenY - originY;
    
    // Reverse the projection math
    const gy = (adjY / (tileHeight / 2) - adjX / (tileWidth / 2)) / 2;
    const gx = (adjY / (tileHeight / 2) + adjX / (tileWidth / 2)) / 2;

    return { x: Math.floor(gx), y: Math.floor(gy) };
  };

  if (dragIndex !== null) {
    if (!blocks[dragIndex]) {
      return;
    }

    // Calculate the target screen position for the block's origin
    const targetScreenX = mouseX - dragOffset.x;
    const targetScreenY = mouseY - dragOffset.y;

    // Convert that target screen position back to grid coordinates
    const gridPos = fromIso(targetScreenX, targetScreenY);

    // Clamp to grid bounds
    const newX = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].width, gridPos.x)
    );
    const newY = Math.max(
      0,
      Math.min(GridMax - blocks[dragIndex].length, gridPos.y)
    );

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
    // Standard Hover Logic
    const { x: gridX, y: gridY } = fromIso(mouseX, mouseY);
    
    if (mouseGrid) {
      if (gridX >= 0 && gridX < GridMax && gridY >= 0 && gridY < GridMax) {
        mouseGrid.innerText = `Grid: (${gridX}, ${gridY})`;
        city.setMouseGridPosition({ x: gridX, y: gridY });
      } else {
        mouseGrid.innerText = `Grid: -`;
      }
    }
  }
};