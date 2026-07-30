// src/util/tabStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getAccountById } from '../elvenar/AccountManager';
import { AccountData } from '../elvenar/Accounts';
import { Badges } from '../model/badges';

interface TabState {
  accountId: string | undefined;
  setAccountId: (id: string | undefined) => void;
  accountData: AccountData | undefined;
  setAccountData: (data: AccountData | undefined) => void;
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

  // Table View Persisted Settings
  showUpgrades: boolean;
  setShowUpgrades: (show: boolean) => void;
  showPerSquare: boolean;
  setShowPerSquare: (show: boolean) => void;
  tableOrderBy: string;
  setTableOrderBy: (orderBy: string) => void;
  tableOrder: 'asc' | 'desc';
  setTableOrder: (order: 'asc' | 'desc') => void;

  // Inventory UI State (In-Memory Only, Not Persisted)
  invSearch: string;
  setInvSearch: (s: string) => void;
  invTypeFilter: string;
  setInvTypeFilter: (s: string) => void;
  invSortBy: string;
  setInvSortBy: (s: string) => void;
  invSortDir: 'asc' | 'desc';
  setInvSortDir: (s: 'asc' | 'desc') => void;
  invAggregate: boolean;
  setInvAggregate: (b: boolean) => void;
  invShowPerSquare: boolean;
  setInvShowPerSquare: (b: boolean) => void;

  // --- FA Persisted Settings Defaults ---
  importedStockByAccount: Record<string, Record<string, Partial<Badges>>>;
  addImportedStock: (accountId: string, memberName: string, badges: Partial<Badges>) => void;
  removeImportedStock: (accountId: string, memberName: string) => void;
  clearImportedStock: (accountId: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      accountId: undefined,
      setAccountId: (id) => {
        if (id) {
          const accountData = getAccountById(id);
          set({ accountId: id, accountData });
        } else {
          return set({ accountId: id, accountData: undefined });
        }
      },
      accountData: undefined,
      setAccountData: (data) => set({ accountData: data }),
      globalError: undefined,
      setGlobalError: (error) => set({ globalError: error }),
      techSprite: undefined,
      setTechSprite: (size) => set({ techSprite: size }),
      forceUpdate: 0,
      triggerForceUpdate: () => set((state) => ({ forceUpdate: state.forceUpdate + 1 })),
      otherCityUpdated: false,
      setOtherCityUpdated: (updated) => set({ otherCityUpdated: updated }),
      legendCollapsed: false,
      setLegendCollapsed: (collapsed) => set({ legendCollapsed: collapsed }),
      viewMode: 'top',
      setViewMode: (mode) => set({ viewMode: mode }),
      avatarPosition: { x: 0, y: 0 },
      setAvatarPosition: (pos) => set({ avatarPosition: pos }),

      // Table View Persisted Settings Defaults
      showUpgrades: false,
      setShowUpgrades: (show) => set({ showUpgrades: show }),
      showPerSquare: false,
      setShowPerSquare: (show) => set({ showPerSquare: show }),
      tableOrderBy: 'name',
      setTableOrderBy: (orderBy) => set({ tableOrderBy: orderBy }),
      tableOrder: 'asc',
      setTableOrder: (order) => set({ tableOrder: order }),

      // Inventory UI State Defaults
      invSearch: '',
      setInvSearch: (s) => set({ invSearch: s }),
      invTypeFilter: '',
      setInvTypeFilter: (s) => set({ invTypeFilter: s }),
      invSortBy: '',
      setInvSortBy: (s) => set({ invSortBy: s }),
      invSortDir: 'asc',
      setInvSortDir: (s) => set({ invSortDir: s }),
      invAggregate: false,
      setInvAggregate: (b) => set({ invAggregate: b }),
      invShowPerSquare: false,
      setInvShowPerSquare: (b) => set({ invShowPerSquare: b }),

      // --- FA Persisted Settings Defaults ---
      importedStockByAccount: {},
      addImportedStock: (accountId, memberName, badges) =>
        set((state) => ({
          importedStockByAccount: {
            ...state.importedStockByAccount,
            [accountId]: {
              ...(state.importedStockByAccount[accountId] || {}),
              [memberName]: badges,
            },
          },
        })),
      removeImportedStock: (accountId, memberName) =>
        set((state) => {
          const accountStock = { ...(state.importedStockByAccount[accountId] || {}) };
          delete accountStock[memberName];
          return {
            importedStockByAccount: {
              ...state.importedStockByAccount,
              [accountId]: accountStock,
            },
          };
        }),
      clearImportedStock: (accountId) =>
        set((state) => ({
          importedStockByAccount: {
            ...state.importedStockByAccount,
            [accountId]: {},
          },
        })),
    }),
    {
      name: 'tab-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => {
        // Exclude the inventory UI state from being written to storage
        const {
          forceUpdate,
          otherCityUpdated,
          invSearch,
          invTypeFilter,
          invSortBy,
          invSortDir,
          invAggregate,
          invShowPerSquare,
          ...toPersist
        } = state;
        return toPersist;
      },
    },
  ),
);
