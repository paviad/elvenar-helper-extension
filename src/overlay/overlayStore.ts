import { create, StoreApi, UseBoundStore } from 'zustand';
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware';
import { chromeStorage } from '../util/chromeStorage';
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
}

let overlayStore: ReturnType<ReturnType<typeof create<OverlayState>>>;

export const generateOverlayStore = (accountId: string) => {
  overlayStore = create<OverlayState>()(
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
};

export const getOverlayStore = () => overlayStore;
