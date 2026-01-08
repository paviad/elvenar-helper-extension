// Custom storage for chrome.storage.local
export const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => (await chrome.storage.local.get(name))[name] ?? null,
  setItem: async (name: string, value: string): Promise<void> => await chrome.storage.local.set({ [name]: value }),
  removeItem: async (name: string): Promise<void> => await chrome.storage.local.remove([name]),
};

export const chromeStorageWithLogging = {
  getItem: async (name: string): Promise<string | null> => {
    const rc = (await chrome.storage.local.get(name))[name] ?? null;
    console.log(`chromeStorage.getItem(${name}) =>`, rc);
    return rc;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const rc = await chrome.storage.local.set({ [name]: value });
    console.log(`chromeStorage.setItem(${name}, ${value})`);
    return rc;
  },
  removeItem: async (name: string): Promise<void> => {
    const rc = await chrome.storage.local.remove([name]);
    console.log(`chromeStorage.removeItem(${name})`);
    return rc;
  },
};
