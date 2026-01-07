// Custom storage for chrome.storage.local
export const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => (await chrome.storage.local.get(name))[name] ?? null,
  setItem: async (name: string, value: string): Promise<void> => await chrome.storage.local.set({ [name]: value }),
  removeItem: async (name: string): Promise<void> => await chrome.storage.local.remove([name]),
};
