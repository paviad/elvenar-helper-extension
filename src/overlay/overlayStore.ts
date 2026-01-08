import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chromeStorage, chromeStorageWithLogging } from '../util/chromeStorage';
import { ChatMessage } from '../model/socketMessages/chatPayload';

interface OverlayState {
  offeredGoods: string[];
  setOfferedGoods: (goods: string[]) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
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
}

let overlayStore: ReturnType<typeof generateOverlayStore>;

export const generateOverlayStore = (accountId: string) => {
  const store = create<OverlayState>()(
    persist(
      (set) => ({
        offeredGoods: [],
        setOfferedGoods: (goods) => set({ offeredGoods: goods }),
        chatMessages: [],
        setChatMessages: (messages) => set({ chatMessages: messages }),
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
      }),
      {
        name: `overlay-store-${accountId}`,
        storage: createJSONStorage(() => chromeStorage),
        partialize: (state) => {
          const { offeredGoods, forceUpdate, overlayExpanded, ...toPersist } = state;
          return toPersist;
        },
      },
    ),
  );
  overlayStore = store;
  return store;
};

export const getOverlayStore = () => overlayStore;
