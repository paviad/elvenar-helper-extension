import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { GameVars } from '../inject/gameVars';
import { SwapBudget } from '../model/kpSwap';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { chromeStorage } from '../util/chromeStorage';
import { ParsedQuestExport } from '../util/parseQuestExport';
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
  // How much knowledge each wonder you have copied a request for can still take. Persisted
  // because the count spans a login: you ask over several threads, and the knowledge only
  // lands once the people after you post.
  swapBudgets: SwapBudget[];
  setSwapBudgets: (budgets: SwapBudget[]) => void;
  // Bumped when AncientWonderService reports a wonder's phase moving on, so the swap tab
  // re-reads the stored figures instead of waiting for the next city load.
  wonderKpUpdate: number;
  triggerWonderKpUpdate: () => void;
  // Persisted, so a page refresh does not blank the tab until the game happens to resend the
  // tournament responses. Every field is refreshed the moment a new one arrives, and the upgrade
  // timers are stored as absolute times so a reloaded copy still counts down correctly.
  tournyData?: TournyData;
  setTournyData: (data: TournyData) => void;
  // The most recent tournament seen, running or just ended. Persisted so the fixed rotation can
  // still name what is coming up when startup data mentions no tournament at all.
  lastTournament?: TournamentGood;
  setLastTournament: (good: TournamentGood) => void;

  retrievingCounter: number;
  setRetrievingCounter: (counter: number) => void;

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
        swapBudgets: [],
        setSwapBudgets: (budgets) => set({ swapBudgets: budgets }),
        wonderKpUpdate: 0,
        triggerWonderKpUpdate: () => set((state) => ({ wonderKpUpdate: state.wonderKpUpdate + 1 })),
        tournyData: undefined,
        setTournyData: (data) => set({ tournyData: data }),
        lastTournament: undefined,
        setLastTournament: (good) => set({ lastTournament: good }),

        retrievingCounter: 0,
        setRetrievingCounter: (counter) => set({ retrievingCounter: counter }),

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
            wonderKpUpdate,
            retrievingCounter,
            autoKpHunt,
            // gameVars,
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
