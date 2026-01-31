export async function openOrRestoreTab(accountId?: string) {
  const extensionTabUrl = chrome.runtime.getURL('tab.html');

  // 1. Query ALL tabs (No permission needed)
  // We cannot use the 'url' filter here without the "tabs" permission.
  const allTabs = await chrome.tabs.query({});

  console.log('All tabs:', allTabs);

  // 2. Filter manually in JS
  // The browser REVEALS the 'url' property for your own extension tabs,
  // even if it hides it for others.
  const existingTab = allTabs.find((tab) => tab.url && tab.url.startsWith(extensionTabUrl));

  const params = {
    url: accountId ? `tab.html#/activate/?accountId=${accountId}` : 'tab.html#/city',
    active: true,
  };

  if (!existingTab) {
    await chrome.tabs.create(params);
  } else {
    // 3. Use the found tab ID
    const tabId = existingTab.id;
    if (!tabId) {
      console.error('Found tab without an ID:', existingTab);
      return;
    }
    await chrome.tabs.update(tabId, params);

    // Bring window to front
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
  }
}
