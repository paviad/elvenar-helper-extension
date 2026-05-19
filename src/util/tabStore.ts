import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TabState {
  accountId: string | undefined;
  setAccountId: (id: string | undefined) => void;
  globalError: string | undefined | null;
  setGlobalError: (error: string | undefined | null) => void;
  techSprite: { url: string; width: number; height: number } | undefined;
  setTechSprite: (size: { url: string; width: number; height: number } | undefined) => void;
  forceUpdate: number;
  triggerForceUpdate: () => void;
  otherCityUpdated: boolean;
  setOtherCityUpdated: (updated: boolean) => void;
  legendCollapsed: boolean;
  setLegendCollapsed: (collapsed: boolean) => void;
  viewMode: 'top' | 'iso' | 'table';
  setViewMode: (mode: 'top' | 'iso' | 'table') => void;
  avatarPosition: { x: number; y: number };
  setAvatarPosition: (pos: { x: number; y: number }) => void;
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
      otherCityUpdated: false,
      setOtherCityUpdated: (updated: boolean) => set({ otherCityUpdated: updated }),
      legendCollapsed: false,
      setLegendCollapsed: (collapsed: boolean) => set({ legendCollapsed: collapsed }),
      viewMode: 'top',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Avatar position default and setter
      avatarPosition: { x: 0, y: 0 },
      setAvatarPosition: (pos) => set({ avatarPosition: pos }),
    }),
    {
      name: 'tab-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => {
        // avatarPosition stays automatically included
        const { forceUpdate, otherCityUpdated, ...toPersist } = state;
        return toPersist;
      },
    },
  ),
);
