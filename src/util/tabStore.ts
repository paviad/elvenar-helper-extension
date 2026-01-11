import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { chromeStorage } from './chromeStorage';

interface TabState {
  accountId: string | undefined;
  setAccountId: (id: string | undefined) => void;
  globalError: string | undefined | null;
  setGlobalError: (error: string | undefined | null) => void;
  techSprite: { url: string; width: number; height: number } | undefined;
  setTechSprite: (size: { url: string; width: number; height: number } | undefined) => void;
  forceUpdate: number;
  triggerForceUpdate: () => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      accountId: undefined,
      setAccountId: (id) => set({ accountId: id }),
      globalError: undefined,
      setGlobalError: (error) => set({ globalError: error }),
      techSprite: undefined,
      setTechSprite: (size: { url: string; width: number; height: number } | undefined) => set({ techSprite: size }),
      forceUpdate: 0,
      triggerForceUpdate: () => set((state) => ({ forceUpdate: state.forceUpdate + 1 })),
    }),
    {
      name: 'tab-store',
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => {
        const { forceUpdate, ...toPersist } = state;
        return toPersist;
      },
    },
  ),
);
