import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Checklist } from '../city/movePlan/checklist';
import { GameVars } from '../inject/gameVars';
import { EventChestArchiveEntry, EventChestInterval } from '../inject/local/eventChestTiming';
import { InitialWorldMapData } from '../model/initialWorldMapData';
import { DEFAULT_FULL_THREAD_POSTS, WatchedWonder } from '../model/kpSwap';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { WorldNeighbor } from '../model/worldNeighbors';
import { DEFAULT_ACTIVITY_SETTINGS } from '../recruits/recruitBook';
import { chromeStorage } from '../util/chromeStorage';
import { createDebouncedJsonStorage } from '../util/debouncedJsonStorage';
import { applyProvinceUpdate, markHelpSent } from '../util/neighborHelpRecord';
import { ParsedQuestExport } from '../util/parseQuestExport';
import { AutomationEntry } from './automationEntry';
import { StrengthModifier } from './counterCalculation';
import { TournamentGood } from './tournamentGuide';
import { TournyData } from './tournyData';

interface OverlayState {
  offeredGoods: string[];
  setOfferedGoods: (goods: string[]) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  cleanupOldMessages: (days: number) => void;
  userMap: Record<string, string>;
  setUserMap: (map: Record<string, string>) => void;
  forceUpdate: number;
  triggerForceUpdate: () => void;
  chapter: number;
  setChapter: (chapter: number) => void;
  overlayExpanded: boolean;
  setOverlayExpanded: (expanded: boolean) => void;
  lastSeenChat?: number;
  setLastSeenChat: (timestamp: number) => void;
  autoOpenTrade?: boolean;
  setAutoOpenTrade: (autoOpen: boolean) => void;
  // Session-scoped: true once a fetchMessages (detail) response arrived this session.
  // Not persisted, so a fresh session starts false and the view flags stored data as stale.
  messagesDetailsReceived: boolean;
  setMessagesDetailsReceived: (received: boolean) => void;
  quests: ParsedQuestExport | undefined;
  setQuests: (quests: ParsedQuestExport | undefined) => void;
  // Swap rows ticked off as repaid, as swapPaidKey() strings. Each key carries the timestamp
  // of the post it belongs to, so posting the next round in a thread retires its old key
  // rather than hiding the new debt. The view prunes keys that no longer match a live row.
  paidSwaps: string[];
  setPaidSwaps: (keys: string[]) => void;
  // Watermark for the swap tally: only request posts of yours newer than this count as debts.
  // Set on first use to whatever your newest existing post is, so the list opens empty rather
  // than full of rounds you settled days ago, and moved forward again whenever you clear.
  // In game time (unix seconds from the posts), not local clock time.
  swapsClearedAt?: number;
  setSwapsClearedAt: (at: number) => void;
  // The wonders you have copied a request for, kept in front of you while you work through
  // the threads. Only which wonders — how much room each has left is derived, so there is no
  // stored figure to drift.
  watchedWonders: WatchedWonder[];
  setWatchedWonders: (wonders: WatchedWonder[]) => void;
  // How many posts make a swap thread worth retiring. Yours to set, since guilds differ in how
  // long they let a thread run.
  fullThreadPosts: number;
  setFullThreadPosts: (posts: number) => void;
  // Persisted, so a page refresh does not blank the tab until the game happens to resend the
  // tournament responses. Every field is refreshed the moment a new one arrives, and the upgrade
  // timers are stored as absolute times so a reloaded copy still counts down correctly.
  tournyData?: TournyData;
  setTournyData: (data: TournyData) => void;
  // The most recent tournament seen, running or just ended. Persisted so the fixed rotation can
  // still name what is coming up when startup data mentions no tournament at all.
  lastTournament?: TournamentGood;
  setLastTournament: (good: TournamentGood) => void;
  // The checklist for the layout last sent from the planner, kept so ticks survive a reload. The
  // layout itself is stored by the planner; this is only the list worked out from it, and which
  // lines the city has shown done.
  movePlan?: Checklist;
  setMovePlan: (checklist: Checklist | undefined) => void;

  retrievingCounter: number;
  // Whether the last count came from the hunt being called off rather than from the outstanding
  // pages being worked off. A zero that arrives that way is not a finished scan, so it raises no
  // alert. Every later count overwrites this, so it cannot be left standing.
  retrievingCounterAbandoned: boolean;
  setRetrievingCounter: (counter: number, abandoned?: boolean) => void;
  initialWorldMapData: InitialWorldMapData | null;
  setInitialWorldMapData: (data: InitialWorldMapData) => void;
  worldNeighbors: WorldNeighbor[];
  setWorldNeighbors: (neighbors: WorldNeighbor[]) => void;
  // Who has been helped is kept in the list itself, so it outlasts the help run that sent it.
  markNeighborHelped: (playerId: number) => void;
  applyNeighborProvinceUpdate: (province: WorldNeighbor) => void;
  neighbourHelpData?: NeighbourHelpData;
  setNeighbourHelpData: (data: NeighbourHelpData) => void;
  modifiers?: StrengthModifier[];
  setModifiers: (modifiers: StrengthModifier[]) => void;

  autoKpHunt?: boolean;
  setAutoKpHunt: (autoKpHunt: boolean) => void;
  kpHuntImportantThreshold: number;
  setKpHuntImportantThreshold: (threshold: number) => void;
  // Off hides what only two hunters together can take. Persisted, like the threshold.
  kpHuntIncludePairs?: boolean;
  setKpHuntIncludePairs: (include: boolean) => void;

  gameVars?: GameVars;
  setGameVars: (gameVars: GameVars) => void;

  // The Production tab's jobs. Persisted, so they are still there after a refresh; whether the
  // tab is monitoring them is deliberately not, and a refresh always comes back stopped.
  productionAutomations: AutomationEntry[];
  setProductionAutomations: (entries: AutomationEntry[]) => void;

  // What it takes for a candidate recruit to count as active: this many signs (score rises, posts)
  // within this many days. Persisted.
  recruitWindowDays: number;
  setRecruitWindowDays: (days: number) => void;
  recruitMinSigns: number;
  setRecruitMinSigns: (signs: number) => void;
  // Whether the Recruits tab reads candidates' scores by itself. Not persisted, like Auto on the
  // KP hunt: it sends requests to the game, and a refresh always comes back stopped.
  autoRefreshRecruits?: boolean;
  setAutoRefreshRecruits: (on: boolean) => void;
  // The same for asking ElvenStats about candidates. Not persisted either.
  autoElvenStats?: boolean;
  setAutoElvenStats: (on: boolean) => void;

  // Gaps between event currency chests in the running event, oldest first, and earlier events'
  // figures put aside with Archive. Both persisted.
  eventChestIntervals: EventChestInterval[];
  addEventChestInterval: (interval: EventChestInterval) => void;
  setEventChestIntervals: (intervals: EventChestInterval[]) => void;
  eventChestArchive: EventChestArchiveEntry[];
  setEventChestArchive: (archive: EventChestArchiveEntry[]) => void;
}

let overlayStore: ReturnType<typeof createOverlayStore>;
let overlayAccountId: string | null = null;

/**
 * One store per account, kept for as long as the account stays. Startup data arrives again every
 * time the game re-syncs, and building a second store there left the mounted tree subscribed to a
 * store nobody wrote to any more, while `chapter` flipped through 0 on the way to its real value -
 * enough on its own to reopen the Trade tab.
 */
export const generateOverlayStore = (accountId: string) => {
  if (overlayAccountId === accountId) {
    return overlayStore;
  }
  overlayAccountId = accountId;
  overlayStore = createOverlayStore(accountId);
  return overlayStore;
};

const createOverlayStore = (accountId: string) => {
  const store = create<OverlayState>()(
    persist(
      (set) => ({
        offeredGoods: [],
        setOfferedGoods: (goods) => set({ offeredGoods: goods }),
        chatMessages: [],
        setChatMessages: (messages) => {
          // Automatic 30-day cleanup whenever the chat is updated
          const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const filteredMessages = messages.filter((msg) => {
            if (!msg.timestamp) return true; // Safe fallback for malformed/legacy data

            // Parse the string timestamp (milliseconds)
            const timeInMs = parseInt(msg.timestamp, 10);
            return timeInMs >= cutoffTime;
          });
          set({ chatMessages: filteredMessages });
        },
        cleanupOldMessages: (days) =>
          set((state) => {
            const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
            return {
              chatMessages: state.chatMessages.filter((msg) => {
                if (!msg.timestamp) return true;

                const timeInMs = parseInt(msg.timestamp, 10);
                return timeInMs >= cutoffTime;
              }),
            };
          }),
        userMap: {},
        setUserMap: (map) => set({ userMap: map }),
        forceUpdate: 0,
        triggerForceUpdate: () => set((state) => ({ forceUpdate: state.forceUpdate + 1 })),
        chapter: 0,
        setChapter: (chapter) => set({ chapter }),
        overlayExpanded: false,
        setOverlayExpanded: (expanded) => set({ overlayExpanded: expanded }),
        lastSeenChat: undefined,
        setLastSeenChat: (timestamp) => set({ lastSeenChat: timestamp }),
        autoOpenTrade: true,
        setAutoOpenTrade: (autoOpen) => set({ autoOpenTrade: autoOpen }),
        messagesDetailsReceived: false,
        setMessagesDetailsReceived: (received) => set({ messagesDetailsReceived: received }),
        quests: undefined,
        setQuests: (quests) => set({ quests }),
        paidSwaps: [],
        setPaidSwaps: (keys) => set({ paidSwaps: keys }),
        swapsClearedAt: undefined,
        setSwapsClearedAt: (at) => set({ swapsClearedAt: at }),
        watchedWonders: [],
        setWatchedWonders: (wonders) => set({ watchedWonders: wonders }),
        fullThreadPosts: DEFAULT_FULL_THREAD_POSTS,
        setFullThreadPosts: (posts) => set({ fullThreadPosts: posts }),
        tournyData: undefined,
        setTournyData: (data) => set({ tournyData: data }),
        lastTournament: undefined,
        setLastTournament: (good) => set({ lastTournament: good }),
        movePlan: undefined,
        setMovePlan: (checklist) => set({ movePlan: checklist }),

        retrievingCounter: 0,
        retrievingCounterAbandoned: false,
        setRetrievingCounter: (counter, abandoned = false) =>
          set({ retrievingCounter: counter, retrievingCounterAbandoned: abandoned }),
        initialWorldMapData: null,
        setInitialWorldMapData: (data) => set({ initialWorldMapData: data }),
        worldNeighbors: [],
        setWorldNeighbors: (neighbors) => set({ worldNeighbors: neighbors }),
        markNeighborHelped: (playerId) =>
          set((state) => ({ worldNeighbors: markHelpSent(state.worldNeighbors, playerId, Date.now()) })),
        applyNeighborProvinceUpdate: (province) =>
          set((state) => ({ worldNeighbors: applyProvinceUpdate(state.worldNeighbors, province, Date.now()) })),
        neighbourHelpData: undefined,
        setNeighbourHelpData: (data) => set({ neighbourHelpData: data }),
        modifiers: [],
        setModifiers: (modifiers) => set({ modifiers }),

        autoKpHunt: false,
        setAutoKpHunt: (autoKpHunt) => set({ autoKpHunt }),
        kpHuntImportantThreshold: 10,
        setKpHuntImportantThreshold: (threshold) => set({ kpHuntImportantThreshold: threshold }),
        kpHuntIncludePairs: true,
        setKpHuntIncludePairs: (include) => set({ kpHuntIncludePairs: include }),

        gameVars: undefined,
        setGameVars: (gameVars) => set({ gameVars }),

        productionAutomations: [],
        setProductionAutomations: (entries) => set({ productionAutomations: entries }),

        recruitWindowDays: DEFAULT_ACTIVITY_SETTINGS.windowDays,
        setRecruitWindowDays: (days) => set({ recruitWindowDays: days }),
        recruitMinSigns: DEFAULT_ACTIVITY_SETTINGS.minSigns,
        setRecruitMinSigns: (signs) => set({ recruitMinSigns: signs }),
        autoRefreshRecruits: false,
        setAutoRefreshRecruits: (on) => set({ autoRefreshRecruits: on }),
        autoElvenStats: false,
        setAutoElvenStats: (on) => set({ autoElvenStats: on }),

        eventChestIntervals: [],
        addEventChestInterval: (interval) =>
          set((state) => ({ eventChestIntervals: [...state.eventChestIntervals, interval] })),
        setEventChestIntervals: (intervals) => set({ eventChestIntervals: intervals }),
        eventChestArchive: [],
        setEventChestArchive: (archive) => set({ eventChestArchive: archive }),
      }),
      {
        name: `overlay-store-${accountId}`,
        // Written a second after changes pause: the whole store, chat included, goes out each time.
        storage: createDebouncedJsonStorage(chromeStorage, 1000),
        partialize: (state) => {
          // Exclude certain states from being persisted
          const {
            offeredGoods,
            forceUpdate,
            overlayExpanded,
            messagesDetailsReceived,
            retrievingCounter,
            retrievingCounterAbandoned,
            initialWorldMapData,
            worldNeighbors,
            neighbourHelpData,
            autoKpHunt,
            autoRefreshRecruits,
            autoElvenStats,
            // gameVars,
            ...toPersist
          } = state;
          // avatarPosition remains in `toPersist` automatically
          return toPersist;
        },
        // zustand catches whatever goes wrong while the saved state is read back - including a
        // throw in an `onFinishHydration` listener, which is where the panel gets built - and hands
        // it only to this callback. Without one it vanishes, and a failed build is an empty panel
        // with nothing in the console to say why.
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            console.error('Error restoring the overlay store:', error);
          }
        },
      },
    ),
  );
  return store;
};

export const getOverlayStore = () => overlayStore;
export const getAccountId = () => overlayAccountId;
