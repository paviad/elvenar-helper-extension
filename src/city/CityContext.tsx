import React, { createContext, useContext, useState, ReactNode, useReducer, useCallback } from 'react';
import { MoveLogInterface } from './MoveLog/MoveLogInterface';
import { CityBlock } from './CityBlock';
import { useTabStore } from '../util/tabStore';
import { getMaxLevels } from '../elvenar/getMaxLevels';
import { UnlockedArea } from '../model/unlockedArea';

interface CityContextType {
  moveLog: MoveLogInterface[];
  setMoveLog: (fn: (prev: MoveLogInterface[]) => MoveLogInterface[]) => void;
  redoStack: MoveLogInterface[];
  setRedoStack: (fn: (prev: MoveLogInterface[]) => MoveLogInterface[]) => void;
  clearRedoStack: () => void;
  blocks: Record<number, CityBlock>;
  setBlocks: (fn: (prev: Record<number, CityBlock>) => Record<number, CityBlock>) => void;
  overwriteBlocks: (blocks: Record<number, CityBlock>) => void;
  dragIndex: number | null;
  setDragIndex: (index: number | null) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (offset: { x: number; y: number }) => void;
  originalPos: { x: number; y: number } | null;
  setOriginalPos: (pos: { x: number; y: number } | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  menu: { key: string | number; x: number; y: number } | null;
  setMenu: (menu: { key: string | number; x: number; y: number } | null) => void;
  maxLevels: Record<string, number>;
  setMaxLevels: (levels: Record<string, number>) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  mousePositionRef: React.RefObject<HTMLDivElement | null>;
  accountId: string | undefined;
  setAccountId: (id: string) => void;
  techSprite: { url: string; width: number; height: number } | undefined;
  handleUndo: () => void;
  handleRedo: () => void;
  GridSize: number;
  GridMax: number;
  opacity: number;
  allTypes: string[];
  unlockedAreas: UnlockedArea[];
  forceUpdate: () => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider = ({
  sourceBlocks,
  unlockedAreas,
  forceUpdate,
  children,
}: {
  sourceBlocks: CityBlock[];
  unlockedAreas: UnlockedArea[];
  forceUpdate: () => void;
  children: ReactNode;
}) => {
  const [moveLog, setMoveLog] = useState<MoveLogInterface[]>([]);
  const [redoStack, setRedoStack] = useState<MoveLogInterface[]>([]);
  const [blocks, setBlocks] = useState<Record<number, CityBlock>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [originalPos, setOriginalPos] = useState<{ x: number; y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [menu, setMenu] = useState<{ key: string | number; x: number; y: number } | null>(null);
  const [maxLevels, setMaxLevels] = useState<Record<string, number>>({});
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const mousePositionRef = React.useRef<HTMLDivElement | null>(null);

  const accountId = useTabStore((state) => state.accountId);
  const setAccountId = useTabStore((state) => state.setAccountId);
  const techSprite = useTabStore((state) => state.techSprite);

  // temporary
  const lastId = React.useRef<number>(-1);
  React.useEffect(() => {
    if (dragIndex === null) return;
    if (blocks[dragIndex].id === lastId.current) return;
    console.log('ElvenAssist: Dragging block:', blocks[dragIndex], lastId.current);
    lastId.current = blocks[dragIndex].id;
  }, [dragIndex, blocks]);
  // end temporary

  React.useEffect(() => {
    setBlocks(sourceBlocks);
  }, [sourceBlocks]);

  const allTypes = React.useMemo(() => {
    const set = new Set<string>();
    (sourceBlocks || []).forEach((b) => set.add(b.type));
    return Array.from(set);
  }, [sourceBlocks]);

  const clearRedoStack = () => {
    setRedoStack([]);
  };

  const GridSize = 15;
  const GridMax = 80;
  const opacity = 0.8;

  // Close menu on click outside
  React.useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [menu]);

  // Close menu on ESC key
  React.useEffect(() => {
    if (!menu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menu]);

  React.useEffect(() => {
    const fetchMaxLevels = async () => {
      const maxLevels = await getMaxLevels();
      setMaxLevels(maxLevels);
    };
    fetchMaxLevels();
  }, []);

  const handleUndo = () => {
    // Prevent undo while dragging
    if (dragIndex !== null) return;

    if (moveLog.length === 0) return;
    const last = moveLog[moveLog.length - 1];
    if (last.type === 'delete' && last.deletedBlock) {
      const g = last.deletedBlock;
      setBlocks((prev) => ({ ...prev, [g.id]: g }));
    } else if (last.type === 'duplicate' && last.duplicatedBlock) {
      const g = last.duplicatedBlock;
      setBlocks((prev) => {
        const { [g.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setBlocks((prev) => ({
        ...prev,
        [last.id]: {
          ...prev[last.id],
          x: last.from.x,
          y: last.from.y,
          moved: last.movedChanged !== prev[last.id].moved,
        },
      }));
    }
    setMoveLog((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    // Prevent redo while dragging
    if (dragIndex !== null) return;

    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    if (last.type === 'delete' && last.deletedBlock) {
      setBlocks((prev) => Object.fromEntries(Object.entries(prev).filter(([_, b]) => b.id !== last.id)));
    } else if (last.type === 'duplicate' && last.duplicatedBlock) {
      const g = last.duplicatedBlock;
      setBlocks((prev) => ({ ...prev, [g.id]: g }));
    } else {
      setBlocks((prev) => ({
        ...prev,
        [last.id]: {
          ...prev[last.id],
          x: last.to.x,
          y: last.to.y,
          moved: last.movedChanged !== prev[last.id].moved,
        },
      }));
    }
    setMoveLog((prev) => [...prev, last]);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const defaultValue: CityContextType = {
    moveLog,
    setMoveLog,
    redoStack,
    setRedoStack,
    clearRedoStack,
    blocks,
    setBlocks,
    overwriteBlocks: setBlocks,
    dragIndex,
    setDragIndex,
    dragOffset,
    setDragOffset,
    originalPos,
    setOriginalPos,
    searchTerm,
    setSearchTerm,
    menu,
    setMenu,
    maxLevels,
    setMaxLevels,
    menuRef,
    svgRef,
    mousePositionRef,
    accountId,
    setAccountId,
    techSprite,
    handleUndo: handleUndo,
    handleRedo: handleRedo,
    GridSize,
    GridMax,
    opacity,
    allTypes,
    unlockedAreas,
    forceUpdate,
  };

  return <CityContext.Provider value={defaultValue}>{children}</CityContext.Provider>;
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
