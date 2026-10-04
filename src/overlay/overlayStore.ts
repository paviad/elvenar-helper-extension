import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_FULL_THREAD_POSTS, WatchedWonder } from '../model/kpSwap';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { chromeStorage } from '../util/chromeStorage';
import { createDebouncedJsonStorage } from '../util/debouncedJsonStorage';
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
      }),
      {
        name: `overlay-store-${accountId}`,
        // Written a second after changes pause: the whole store, chat included, goes out each time.
        storage: createDebouncedJsonStorage(chromeStorage, 1000),
        partialize: (state) => {
          const { offeredGoods, forceUpdate, overlayExpanded, messagesDetailsReceived, ...toPersist } = state;
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
