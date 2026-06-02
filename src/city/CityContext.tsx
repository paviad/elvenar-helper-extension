import React from 'react';
import { getAccountById, saveCityInPlace, saveCurrentCityAs } from '../elvenar/AccountManager';
import { getEffects } from '../elvenar/getEffects';
import { getEvolvingBuildings } from '../elvenar/getEvolvingBuildings';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { getMaxLevels } from '../elvenar/getMaxLevels';
import { CityEntityEx } from '../model/cityEntity';
import { Effect } from '../model/effect';
import { StageProvision } from '../model/stageProvision';
import { UnlockedArea } from '../model/unlockedArea';
import { useTabStore } from '../util/tabStore';
import { BuildingFinder } from './buildingFinder';
import { CityBlock } from './CityBlock';
import { generateCity, saveBack } from './generateCity';
import { generateCityBlocks } from './generateCityBlocks';
import { generateUnlockedAreas } from './generateUnlockedAreas';
import { MoveLogInterface } from './MoveLog/moveLogInterface';
import { getMaxChapter } from '../elvenar/getMaxChapter';

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
  popRequired: number;
  setPopRequired: (num: number) => void;
  residentialPop: number;
  setResidentialPop: (num: number) => void;
  rankingPoints: number;
  setRankingPoints: (num: number) => void;
  awLevels: number;
  setAwLevels: (num: number) => void;
  mhRankingPoints: number;
  setMhRankingPoints: (num: number) => void;
  mouseGridPosition: { x: number; y: number } | null;
  setMouseGridPosition: (pos: { x: number; y: number } | null) => void;
  resources: Record<string, number>;
  emptySquares: number;
  modified: boolean;
  maxChapter: number;
}

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
  const [buildingFinder, setBuildingFinder] = React.useState<BuildingFinder>(new BuildingFinder());
  const [goodsNames, setGoodsNames] = React.useState<Record<string, string>>({});
  const [evolvingBuildings, setEvolvingBuildings] = React.useState<StageProvision[]>([]);
  const [effects, setEffects] = React.useState<Effect[]>([]);
  const [popRequired, setPopRequired] = React.useState<number>(0);
  const [residentialPop, setResidentialPop] = React.useState<number>(0);
  const [rankingPoints, setRankingPoints] = React.useState<number>(0);
  const [resources, setResources] = React.useState<Record<string, number>>({});
  const [mouseGridPosition, setMouseGridPosition] = React.useState<{ x: number; y: number } | null>(null);

  const [awLevels, setAwLevels] = React.useState<number>(0);
  const [mhRankingPoints, setMhRankingPoints] = React.useState<number>(0);

  const accountId = useTabStore((state) => state.accountId);
  const setAccountId = useTabStore((state) => state.setAccountId);
  const techSprite = useTabStore((state) => state.techSprite);

  const [chapter, setChapter] = React.useState<number>(100);
  const [squadSize, setSquadSize] = React.useState<number>(0);
  const [maxChapter, setMaxChapter] = React.useState<number>(25);

  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);
  const triggerForceUpdate = useTabStore((state) => state.triggerForceUpdate);
  const forceUpdate = useTabStore((state) => state.forceUpdate);

  const [localRefresh, triggerLocalRefresh] = React.useReducer((x) => x + 1, 0);

  const [emptySquares, setEmptySquares] = React.useState<number>(0);

  const [ready, setReady] = React.useState<boolean>(false);
  const [modified, setModified] = React.useState<boolean>(false);

  let boostedGoods: string[] = [];
  let isDetached = true;
  let race = 'humans';
  if (accountId) {
    const accountData = getAccountById(accountId);
    if (accountData?.cityQuery) {
      race = accountData.cityQuery.userData.race;
      boostedGoods = accountData.cityQuery.boostedGoods;
    }
    isDetached = accountData?.isDetached ?? true;
  }

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
      void saveCityInPlace(accountId!, cityEntities, chapter);
    } else {
      void saveCityAuto();
    }
  }, [blocks, ready, dragIndex]);

  async function saveCityAuto() {
    if (!accountId) return;
    const accountName = getAccountById(accountId)?.cityQuery?.accountName || accountId;
    if (accountName.endsWith(' (autosave)')) {
      return;
    }
    const cityEntities = saveBack(Object.values(blocks));
    const name = `${accountName} (autosave)`;
    const autoSaveAccountId = `${accountId} (autosave)`;
    await saveCurrentCityAs(accountId, autoSaveAccountId, cityEntities, chapter, name);
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
    setReady(true);
  }, [cityEntities]);

  React.useEffect(() => {
    // don't calculate while dragging to avoid performance issues
    if (dragIndex !== null) {
      return;
    }

    const allSquares = unlockedAreas.flatMap((area) => {
      const squares = [];
      for (let x = area.x; x <= area.x + area.width - 1; x++) {
        for (let y = area.y; y <= area.y + area.length - 1; y++) {
          squares.push(`${x},${y}`);
        }
      }
      return squares;
    });
    const blockSquares = Object.values(blocks).flatMap((b) => {
      const squares = [];
      for (let x = b.x; x <= b.x + b.width - 1; x++) {
        for (let y = b.y; y <= b.y + b.length - 1; y++) {
          squares.push(`${x},${y}`);
        }
      }
      return squares;
    });
    const setOfBlockSquares: Set<string> = new Set(blockSquares);
    const unoccupiedSquares = allSquares.filter((x) => !setOfBlockSquares.has(x));
    setEmptySquares(unoccupiedSquares.length);
  }, [blocks, dragIndex]);

  // temporary
  const lastId = React.useRef<number>(-1);
  React.useEffect(() => {
    if (dragIndex === null) return;
    if (blocks[dragIndex].id === lastId.current) return;
    // console.log('ElvenAssist: Dragging block:', blocks[dragIndex], lastId.current);
    lastId.current = blocks[dragIndex].id;
  }, [dragIndex, blocks]);
  // end temporary

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

  const allTypes = React.useMemo(() => {
    const set = new Set<string>();
    const blocksArray = Object.values(blocks);
    (blocksArray || []).forEach((b) => set.add(b.type));
    return Array.from(set);
  }, [blocks]);

  const clearRedoStack = () => {
    setRedoStack([]);
  };

  const GridSize = 15;
  const GridMax = 80;
  const PaddingTiles = 20;
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
    void fetchMaxLevels();
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
    PaddingTiles,
    opacity,
    allTypes,
    unlockedAreas,
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
    popRequired,
    setPopRequired,
    residentialPop,
    setResidentialPop,
    rankingPoints,
    setRankingPoints,
    awLevels,
    setAwLevels,
    mhRankingPoints,
    setMhRankingPoints,
    mouseGridPosition,
    setMouseGridPosition,
    resources,
    emptySquares,
    modified,
    maxChapter,
  };

  return <CityContext.Provider value={defaultValue}>{children}</CityContext.Provider>;
};

export const useCity = () => {
  const context = React.useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
