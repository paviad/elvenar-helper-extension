import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
}

export const useOverlayStore = create<OverlayState>()(
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
    }),
    {
      name: 'tab-store',
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => {
        const { offeredGoods, ...toPersist } = state;
        return toPersist;
      },
    },
  ),
);
