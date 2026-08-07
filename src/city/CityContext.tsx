import React from 'react';
import { getAccountById, saveCityInPlace, saveCurrentCityAs } from '../elvenar/AccountManager';
import { getEffects } from '../elvenar/getEffects';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { getMaxChapter } from '../elvenar/getMaxChapter';
import { getMaxLevels } from '../elvenar/getMaxLevels';
import { CityEntityEx } from '../model/cityEntity';
import { Effect } from '../model/effect';
import { StageProvision } from '../model/stageProvision';
import { UnlockedArea } from '../model/unlockedArea';
import { useTabStore } from '../util/tabStore';
import { BuildingFinder, getBuildingFinder } from './buildingFinder';
import { calculateCityTotals, CityTotals } from './calculateCityTotals';
import { CityBlock } from './CityBlock';
import { generateCity, saveBack } from './generateCity';
import { generateCityBlocks } from './generateCityBlocks';
import { generateUnlockedAreas } from './generateUnlockedAreas';
import { BlockOpacity, GridMax, GridSize, PaddingTiles } from './gridConstants';
import { MoveLogInterface } from './MoveLog/moveLogInterface';
import { findMatchingBlockIds } from './searchMatcher';
import { useSettledValue } from './useSettledValue';

/** Footprint a replaced building used to occupy, marked on the grid until it is reused. */
export interface ReplacedArea {
  x: number;
  y: number;
  width: number;
  length: number;
  name: string;
}

export interface CityContextType {
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
  /** Ids of blocks matching the search term. Derived, so searching never edits the city. */
  highlightedIds: Set<number>;
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
  PaddingTiles: number;
  opacity: number;
  allTypes: string[];
  unlockedAreas: UnlockedArea[];
  setUnlockedAreas: (fn: (prev: UnlockedArea[]) => UnlockedArea[]) => void;
  /** When true, the grid lets the user pick a locked expansion to unlock. */
  unlockAreaMode: boolean;
  setUnlockAreaMode: (on: boolean) => void;
  /** Where a just-replaced building stood, highlighted on the grid. */
  replacedArea: ReplacedArea | null;
  setReplacedArea: (area: ReplacedArea | null) => void;
  triggerForceUpdate: () => void;
  forceUpdate: number;
  race: string;
  buildingFinder: BuildingFinder;
  goodsNames: Record<string, string>;
  evolvingBuildings: StageProvision[];
  effects: Effect[];
  boostedGoods: string[];
  chapter: number;
  setChapter: (chapter: number) => void;
  squadSize: number;
  setSquadSize: (size: number) => void;
  rankingPoints: number;
  setRankingPoints: (num: number) => void;
  /** Provision and requirement totals, derived from the blocks. */
  cityTotals: CityTotals;
  resources: Record<string, number>;
  emptySquares: number;
  modified: boolean;
  maxChapter: number;
}

/** Stable empty default, so a city with no query does not hand out a fresh array each render. */
const NO_BOOSTED_GOODS: string[] = [];

const CityContext = React.createContext<CityContextType | undefined>(undefined);

export const CityProvider = ({ children }: { children: React.ReactNode }) => {
  const [moveLog, setMoveLog] = React.useState<MoveLogInterface[]>([]);
  const [redoStack, setRedoStack] = React.useState<MoveLogInterface[]>([]);
  const [blocks, setBlocks] = React.useState<Record<number, CityBlock>>({});
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [originalPos, setOriginalPos] = React.useState<{ x: number; y: number } | null>(null);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [menu, setMenu] = React.useState<{ key: string | number; x: number; y: number } | null>(null);
  const [maxLevels, setMaxLevels] = React.useState<Record<string, number>>({});
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const mousePositionRef = React.useRef<HTMLDivElement | null>(null);
  const buildingFinder = getBuildingFinder();
  const [goodsNames, setGoodsNames] = React.useState<Record<string, string>>({});
  const [evolvingBuildings, setEvolvingBuildings] = React.useState<StageProvision[]>([]);
  const [effects, setEffects] = React.useState<Effect[]>([]);
  const [rankingPoints, setRankingPoints] = React.useState<number>(0);
  const [resources, setResources] = React.useState<Record<string, number>>({});

  const accountId = useTabStore((state) => state.accountId);
  const setAccountId = useTabStore((state) => state.setAccountId);
  const techSprite = useTabStore((state) => state.techSprite);

  const [chapter, setChapter] = React.useState<number>(100);
  const [squadSize, setSquadSize] = React.useState<number>(0);
  const [maxChapter, setMaxChapter] = React.useState<number>(25);

  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);
  const [unlockAreaMode, setUnlockAreaMode] = React.useState(false);
  const [replacedArea, setReplacedArea] = React.useState<ReplacedArea | null>(null);
  const triggerForceUpdate = useTabStore((state) => state.triggerForceUpdate);
  const forceUpdate = useTabStore((state) => state.forceUpdate);

  const [localRefresh, triggerLocalRefresh] = React.useReducer((x) => x + 1, 0);

  const [ready, setReady] = React.useState<boolean>(false);
  const [modified, setModified] = React.useState<boolean>(false);

  // Account data is only replaced when the city is switched or reloaded, and a reload
  // bumps forceUpdate, so those two cover every change to what this reads.
  const { race, boostedGoods, isDetached } = React.useMemo(() => {
    const accountData = accountId ? getAccountById(accountId) : undefined;
    return {
      race: accountData?.cityQuery?.userData.race ?? 'humans',
      boostedGoods: accountData?.cityQuery?.boostedGoods ?? NO_BOOSTED_GOODS,
      isDetached: accountData?.isDetached ?? true,
    };
  }, [accountId, forceUpdate]);

  const previousAccountId = React.useRef<string | undefined>(accountId);

  React.useEffect(() => {
    async function fetchMaxChapter() {
      const maxChapter = await getMaxChapter();
      setMaxChapter(maxChapter);
    }
    void fetchMaxChapter();
  }, []);

  React.useEffect(() => {
    // skip if it's the first load, we will load the city data in another effect
    if (previousAccountId.current !== accountId) {
      setReady(false);
      firstLoad.current = true;
      setModified(false);
      // The marker belongs to the city it was made in.
      setReplacedArea(null);
      triggerLocalRefresh();
    }
    previousAccountId.current = accountId;
  }, [accountId]);

  React.useEffect(() => {
    if (moveLog.length !== 0) {
      return;
    }

    // skip if it's the first load, we will load the city data in another effect
    if (forceUpdate === 0) {
      return;
    }
    setReady(false);
    firstLoad.current = true;
    setModified(false);
    triggerLocalRefresh();
  }, [forceUpdate]);

  React.useEffect(() => {
    setReady(false);
    async function fetchCityData() {
      if (!accountId) {
        return;
      }

      const autoSaveData = getAccountById(`${accountId} (autosave)`);
      setModified(!!autoSaveData); // modified if there's an autosave, otherwise not
      const accountData = autoSaveData ?? getAccountById(accountId);

      if (!accountData || !accountData.cityQuery) {
        return;
      }

      const entities = await generateCity(accountData);
      if (entities) {
        setCityEntities([entities.q, entities.unlockedAreas]);
      }

      if (accountData?.cityQuery) {
        setChapter(accountData.cityQuery.chapter);
        setSquadSize(accountData.cityQuery.squadSize || 0);
        setRankingPoints(accountData.cityQuery.rankingPoints || 0);
        setResources(accountData.cityQuery.cityResources || {});
      }
      setSearchTerm('');
      setMoveLog([]);
      setRedoStack([]);
    }
    void fetchCityData();
  }, [localRefresh]);

  const firstLoad = React.useRef(true);

  React.useEffect(() => {
    if (!ready || dragIndex !== null) {
      return;
    }
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setModified(true);
    if (isDetached) {
      const cityEntities = saveBack(Object.values(blocks));
      void saveCityInPlace(accountId!, cityEntities, chapter, unlockedAreas);
    } else {
      void saveCityAuto();
    }
  }, [blocks, unlockedAreas, ready, dragIndex]);

  async function saveCityAuto() {
    if (!accountId) return;
    const accountName = getAccountById(accountId)?.cityQuery?.accountName || accountId;
    if (accountName.endsWith(' (autosave)')) {
      return;
    }
    const cityEntities = saveBack(Object.values(blocks));
    const name = `${accountName} (autosave)`;
    const autoSaveAccountId = `${accountId} (autosave)`;
    await saveCurrentCityAs(accountId, autoSaveAccountId, cityEntities, chapter, name, unlockedAreas);
  }

  React.useEffect(() => {
    if (cityEntities[0].length === 0) {
      return;
    }
    const blocksArr = generateCityBlocks(cityEntities[0]);
    const unlockedAreas = generateUnlockedAreas(cityEntities[1]);
    const blocks = Object.fromEntries(blocksArr.map((b) => [b.id, b]));
    setBlocks(blocks);
    setUnlockedAreas(unlockedAreas);
    setUnlockAreaMode(false);
    setDragIndex(null);
    setReady(true);
  }, [cityEntities]);

  React.useEffect(() => {
    async function Do() {
      await buildingFinder?.ensureInitialized();
    }
    void Do();
  }, [buildingFinder]);

  React.useEffect(() => {
    async function Do() {
      const goodsNames = await getGoodsNames();
      setGoodsNames(goodsNames);
      const evolvingBuildings = await getEvolvingBuildings();
      setEvolvingBuildings(evolvingBuildings);
      const effects = await getEffects();
      setEffects(effects);
    }
    void Do();
  }, []);

  // Derivations over the whole city read the settled layout, so a drag does not
  // rescan every block twenty times a second. They catch up when the block lands.
  const settledBlocks = useSettledValue(blocks, dragIndex === null);

  const highlightedIds = React.useMemo(
    () => findMatchingBlockIds(settledBlocks, searchTerm),
    [settledBlocks, searchTerm],
  );

  const cityTotals = React.useMemo(
    () => calculateCityTotals(Object.values(settledBlocks), buildingFinder, evolvingBuildings),
    [settledBlocks, buildingFinder, evolvingBuildings],
  );

  const allTypes = React.useMemo(() => {
    const set = new Set<string>();
    Object.values(settledBlocks).forEach((b) => set.add(b.type));
    return Array.from(set);
  }, [settledBlocks]);

  // Unlocked tiles no block sits on. Derived like the rest of the whole-city figures, off
  // the settled layout - which is what the dragIndex guard it used to carry was for. As an
  // effect it also listed only the blocks as a dependency, so unlocking an expansion left
  // the count untouched until the next time a building moved.
  const emptySquares = React.useMemo(() => {
    const allSquares = unlockedAreas.flatMap((area) => {
      const squares = [];
      for (let x = area.x; x <= area.x + area.width - 1; x++) {
        for (let y = area.y; y <= area.y + area.length - 1; y++) {
          squares.push(`${x},${y}`);
        }
      }
      return squares;
    });
    const blockSquares = Object.values(settledBlocks).flatMap((b) => {
      const squares = [];
      for (let x = b.x; x <= b.x + b.width - 1; x++) {
        for (let y = b.y; y <= b.y + b.length - 1; y++) {
          squares.push(`${x},${y}`);
        }
      }
      return squares;
    });
    const setOfBlockSquares: Set<string> = new Set(blockSquares);
    return allSquares.filter((x) => !setOfBlockSquares.has(x)).length;
  }, [settledBlocks, unlockedAreas]);

  const clearRedoStack = React.useCallback(() => {
    setRedoStack([]);
  }, []);

  const opacity = BlockOpacity;

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
    void fetchMaxLevels();
  }, []);

  const handleUndo = React.useCallback(() => {
    // Prevent undo while dragging
    if (dragIndex !== null) return;

    if (moveLog.length === 0) return;
    const last = moveLog[moveLog.length - 1];
    if (last.type === 'delete' && last.deletedBlock) {
      const g = last.deletedBlock;
      setBlocks((prev) => ({ ...prev, [g.id]: g }));
    } else if (last.type === 'unlock' && last.unlockedArea) {
      const a = last.unlockedArea;
      setUnlockedAreas((prev) => {
        const idx = prev.findIndex((r) => r.x === a.x && r.y === a.y && r.width === a.width && r.length === a.length);
        return idx === -1 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
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
  }, [dragIndex, moveLog]);

  const handleRedo = React.useCallback(() => {
    // Prevent redo while dragging
    if (dragIndex !== null) return;

    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    if (last.type === 'delete' && last.deletedBlock) {
      setBlocks((prev) => Object.fromEntries(Object.entries(prev).filter(([_, b]) => b.id !== last.id)));
    } else if (last.type === 'unlock' && last.unlockedArea) {
      const a = last.unlockedArea;
      setUnlockedAreas((prev) => [...prev, a]);
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
  }, [dragIndex, redoStack]);

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

  // Memoised so a provider re-render alone does not invalidate every consumer. The
  // dependency list is exhaustive on purpose: a missing entry hands out stale context,
  // and nothing in the lint setup checks it. Setters, refs and grid constants are
  // stable by construction and so are omitted.
  const defaultValue: CityContextType = React.useMemo(
    () => ({
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
      highlightedIds,
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
      PaddingTiles,
      opacity,
      allTypes,
      unlockedAreas,
      setUnlockedAreas,
      unlockAreaMode,
      setUnlockAreaMode,
      replacedArea,
      setReplacedArea,
      triggerForceUpdate,
      forceUpdate,
      race,
      buildingFinder,
      goodsNames,
      evolvingBuildings,
      effects,
      boostedGoods,
      chapter,
      setChapter,
      squadSize,
      setSquadSize,
      rankingPoints,
      setRankingPoints,
      cityTotals,
      resources,
      emptySquares,
      modified,
      maxChapter,
    }),
    [
      moveLog,
      redoStack,
      clearRedoStack,
      blocks,
      dragIndex,
      dragOffset,
      originalPos,
      searchTerm,
      highlightedIds,
      menu,
      maxLevels,
      accountId,
      setAccountId,
      techSprite,
      handleUndo,
      handleRedo,
      allTypes,
      unlockedAreas,
      unlockAreaMode,
      replacedArea,
      triggerForceUpdate,
      forceUpdate,
      race,
      buildingFinder,
      goodsNames,
      evolvingBuildings,
      effects,
      boostedGoods,
      chapter,
      squadSize,
      rankingPoints,
      cityTotals,
      resources,
      emptySquares,
      modified,
      maxChapter,
    ],
  );

  return <CityContext.Provider value={defaultValue}>{children}</CityContext.Provider>;
};

export const useCity = () => {
  const context = React.useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
