import React from 'react';

export interface ScrollOffset {
  left: number;
  top: number;
}

export interface AnchorArgs {
  /** Point under the cursor in content coordinates, at the current zoom. */
  contentX: number;
  contentY: number;
  /** Cursor position within the container. */
  mouseX: number;
  mouseY: number;
  currentZoom: number;
  newZoom: number;
}

export interface PanZoomOptions {
  /** Discrete zoom steps, ascending. */
  zoomLevels: number[];
  /**
   * Scroll offset that keeps the point under the cursor in place across a zoom
   * change. The two grids differ here: the top-down view scales the content point,
   * the isometric view re-projects the tile at the new zoom.
   */
  anchorScroll: (args: AnchorArgs) => ScrollOffset;
  /** Cursor to restore once a pan finishes. Evaluated when the pan ends. */
  idleCursor: () => string;
}

/** Distance in px the cursor must travel before a press counts as a pan, not a click. */
const PAN_THRESHOLD = 5;

/**
 * The next step on the zoom ladder for a wheel delta. Scrolling up (negative delta)
 * zooms in. A zoom that is not exactly on the ladder snaps to the nearest step first.
 */
export function nextZoom(zoomLevels: number[], currentZoom: number, deltaY: number): number {
  let currentIndex = zoomLevels.findIndex((z) => Math.abs(z - currentZoom) < 0.001);

  if (currentIndex === -1) {
    let minDiff = Infinity;
    zoomLevels.forEach((z, i) => {
      const diff = Math.abs(z - currentZoom);
      if (diff < minDiff) {
        minDiff = diff;
        currentIndex = i;
      }
    });
  }

  let nextIndex = currentIndex;
  if (deltaY < 0) {
    nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
  } else if (deltaY > 0) {
    nextIndex = Math.max(currentIndex - 1, 0);
  }

  return zoomLevels[nextIndex];
}

/**
 * Scroll-container behaviour shared by both city grid views: cursor-anchored wheel
 * zoom through a fixed ladder, and drag-to-pan that does not swallow clicks.
 *
 * Zoom changes scroll position and size in the same commit, so the new scroll offset
 * is stashed in a ref and applied in a layout effect, before the browser paints.
 */
export function usePanZoom({ zoomLevels, anchorScroll, idleCursor }: PanZoomOptions) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = React.useState(1);
  const zoomRef = React.useRef(1);
  const pendingScrollUpdate = React.useRef<ScrollOffset | null>(null);

  const isPanning = React.useRef(false);
  const hasPanned = React.useRef(false);
  const startPan = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // The wheel listener is registered once, so read the callers' latest callbacks
  // through refs rather than capturing the first render's copies. Synced in an effect
  // rather than during render: every reader is a wheel or mouse handler, so none of them
  // can run before the commit that updates these.
  const anchorScrollRef = React.useRef(anchorScroll);
  const zoomLevelsRef = React.useRef(zoomLevels);
  const idleCursorRef = React.useRef(idleCursor);
  React.useEffect(() => {
    anchorScrollRef.current = anchorScroll;
    zoomLevelsRef.current = zoomLevels;
    idleCursorRef.current = idleCursor;
  });

  React.useLayoutEffect(() => {
    if (pendingScrollUpdate.current && containerRef.current) {
      containerRef.current.scrollLeft = pendingScrollUpdate.current.left;
      containerRef.current.scrollTop = pendingScrollUpdate.current.top;
      pendingScrollUpdate.current = null;
    }
  });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = zoomRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // A zoom queued but not yet applied is the truth about where we are.
      const scrollLeft = pendingScrollUpdate.current ? pendingScrollUpdate.current.left : container.scrollLeft;
      const scrollTop = pendingScrollUpdate.current ? pendingScrollUpdate.current.top : container.scrollTop;

      const contentX = scrollLeft + mouseX;
      const contentY = scrollTop + mouseY;

      const newZoom = nextZoom(zoomLevelsRef.current, currentZoom, e.deltaY);
      if (newZoom === currentZoom) return;

      pendingScrollUpdate.current = anchorScrollRef.current({
        contentX,
        contentY,
        mouseX,
        mouseY,
        currentZoom,
        newZoom,
      });
      zoomRef.current = newZoom;
      setZoom(newZoom);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  /** Jumps to a zoom level outright, for callers framing a particular spot. */
  const zoomTo = React.useCallback((level: number) => {
    zoomRef.current = level;
    setZoom(level);
  }, []);

  const endPan = () => {
    if (isPanning.current && containerRef.current) {
      isPanning.current = false;
      containerRef.current.style.cursor = idleCursorRef.current();
    }
  };

  const panHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
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
    },

    onMouseMove: (e: React.MouseEvent) => {
      if (!isPanning.current || !containerRef.current) return;

      const dx = e.clientX - startPan.current.x;
      const dy = e.clientY - startPan.current.y;

      if (!hasPanned.current && (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD)) {
        hasPanned.current = true;
        containerRef.current.style.cursor = 'grabbing';
      }

      if (hasPanned.current) {
        containerRef.current.scrollLeft = startPan.current.scrollLeft - dx;
        containerRef.current.scrollTop = startPan.current.scrollTop - dy;
      }
    },

    onMouseUp: endPan,
    onMouseLeave: endPan,

    /** Stops a pan that ended over a block from also being treated as a drop. */
    onClickCapture: (e: React.MouseEvent) => {
      if (hasPanned.current) {
        e.stopPropagation();
        hasPanned.current = false;
      }
    },
  };

  return { containerRef, zoom, zoomTo, panHandlers };
}
