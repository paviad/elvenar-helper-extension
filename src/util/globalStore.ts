import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Custom storage for chrome.storage.local
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => (await chrome.storage.local.get(name))[name] ?? null,
  setItem: async (name: string, value: string): Promise<void> => await chrome.storage.local.set({ [name]: value }),
  removeItem: async (name: string): Promise<void> => await chrome.storage.local.remove([name]),
};

interface GlobalState {
  accountId: string | undefined;
  setAccountId: (id: string | undefined) => void;
  globalError: string | undefined | null;
  setGlobalError: (error: string | undefined | null) => void;
  techSprite: { url: string; width: number; height: number } | undefined;
  setTechSprite: (size: { url: string; width: number; height: number } | undefined) => void;
  // Add other global state fields and setters here as needed
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      accountId: undefined,
      setAccountId: (id) => set({ accountId: id }),
      globalError: undefined,
      setGlobalError: (error) => set({ globalError: error }),
      techSprite: undefined,
      setTechSprite: (size: { url: string; width: number; height: number } | undefined) => set({ techSprite: size }),
    }),
    {
      name: 'global-store',
      storage: createJSONStorage(() => chromeStorage),
    },
  ),
);
