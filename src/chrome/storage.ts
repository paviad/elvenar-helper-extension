export async function getFromStorage(key: string): Promise<string | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] as string | null;
}

export async function saveToStorage(key: string, value: string): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getAllKeysFromStorage(): Promise<string[]> {
  // Workaround for versions older than 130 where getKeys is not available
  if (!chrome.storage.local.getKeys) {
    const result = await chrome.storage.local.get();
    return Object.keys(result);
  }

  const result = await chrome.storage.local.getKeys();
  return result;
}

export async function removeFromStorage(keys: string | string[]): Promise<void> {
  await chrome.storage.local.remove(keys);
}

export async function clearStorage(): Promise<void> {
  await chrome.storage.local.clear();
}
