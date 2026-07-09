import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { WorldNeighbor } from '../model/worldNeighbors';
import { chromeStorage } from '../util/chromeStorage';
import { ParsedQuestExport } from '../util/parseQuestExport';
import { StrengthModifier } from './counterCalculation';
import { TournyData } from './tournyData';
import { GameVars } from '../inject/gameVars';

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
  eeUpdate: number;
  triggerEeUpdate: () => void;
  messagesUpdate: number;
  triggerMessagesUpdate: () => void;
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
  retrievingCounter: number;
  setRetrievingCounter: (counter: number) => void;
  initialWorldMapData: InitialWorldMapData | null;
  setInitialWorldMapData: (data: InitialWorldMapData) => void;
  worldNeighbors: WorldNeighbor[];
  setWorldNeighbors: (neighbors: WorldNeighbor[]) => void;
  neighbourHelpData?: NeighbourHelpData;
  setNeighbourHelpData: (data: NeighbourHelpData) => void;
  tournyData?: TournyData;
  setTournyData: (data: TournyData) => void;
  modifiers?: StrengthModifier[];
  setModifiers: (modifiers: StrengthModifier[]) => void;

  autoKpHunt?: boolean;
  setAutoKpHunt: (autoKpHunt: boolean) => void;
  kpHuntImportantThreshold: number;
  setKpHuntImportantThreshold: (threshold: number) => void;

  gameVars?: GameVars;
  setGameVars: (gameVars: GameVars) => void;
}

let overlayStore: ReturnType<typeof generateOverlayStore>;
let overlayAccountId: string | null = null;

export const generateOverlayStore = (accountId: string) => {
  overlayAccountId = accountId;
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
        eeUpdate: 0,
        triggerEeUpdate: () => set((state) => ({ eeUpdate: state.eeUpdate + 1 })),
        messagesUpdate: 0,
        triggerMessagesUpdate: () => set((state) => ({ messagesUpdate: state.messagesUpdate + 1 })),
        messagesDetailsReceived: false,
        setMessagesDetailsReceived: (received) => set({ messagesDetailsReceived: received }),
        quests: undefined,
        setQuests: (quests) => set({ quests }),
        paidSwaps: [],
        setPaidSwaps: (keys) => set({ paidSwaps: keys }),
        swapsClearedAt: undefined,
        setSwapsClearedAt: (at) => set({ swapsClearedAt: at }),
        retrievingCounter: 0,
        setRetrievingCounter: (counter) => set({ retrievingCounter: counter }),
        initialWorldMapData: null,
        setInitialWorldMapData: (data) => set({ initialWorldMapData: data }),
        worldNeighbors: [],
        setWorldNeighbors: (neighbors) => set({ worldNeighbors: neighbors }),
        neighbourHelpData: undefined,
        setNeighbourHelpData: (data) => set({ neighbourHelpData: data }),
        tournyData: undefined,
        setTournyData: (data) => set({ tournyData: data }),
        modifiers: [],
        setModifiers: (modifiers) => set({ modifiers }),

        autoKpHunt: false,
        setAutoKpHunt: (autoKpHunt) => set({ autoKpHunt }),
        kpHuntImportantThreshold: 10,
        setKpHuntImportantThreshold: (threshold) => set({ kpHuntImportantThreshold: threshold }),

        gameVars: undefined,
        setGameVars: (gameVars) => set({ gameVars }),
      }),
      {
        name: `overlay-store-${accountId}`,
        storage: createJSONStorage(() => chromeStorage),
        partialize: (state) => {
          // Exclude certain states from being persisted
          const {
            offeredGoods,
            forceUpdate,
            overlayExpanded,
            eeUpdate,
            messagesUpdate,
            messagesDetailsReceived,
            retrievingCounter,
            initialWorldMapData,
            worldNeighbors,
            neighbourHelpData,
            autoKpHunt,
            // gameVars,
            // tournyData,
            ...toPersist
          } = state;
          // avatarPosition remains in `toPersist` automatically
          return toPersist;
        },
      },
    ),
  );
  overlayStore = store;
  return store;
};

export const getOverlayStore = () => overlayStore;
export const getAccountId = () => overlayAccountId;
