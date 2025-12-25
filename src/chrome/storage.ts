export async function getFromStorage(key: string): Promise<string | null> {
  const result = await chrome.storage.sync.get(key);
  return result[key] as string | null;
}

export async function saveToStorage(key: string, value: string): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
}
