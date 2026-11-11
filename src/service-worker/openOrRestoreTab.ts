import { ExtensionTabPage } from '../chrome/messages';

/**
 * Opens the extension's tab, or brings the one already open to the front, on the page named or
 * the City Planner. With an account it goes by way of the page that selects that account first.
 */
export async function openOrRestoreTab(accountId?: string, page?: ExtensionTabPage) {
  const params = {
    url: accountId
      ? `tab.html#/activate/?accountId=${accountId}${page ? `&page=${page}` : ''}`
      : `tab.html#/${page ?? 'city'}`,
    active: true,
  };

  // ---------------------------------------------------------
  // STRATEGY A: Chrome (The "Contexts" API)
  // ---------------------------------------------------------
  // This is the superior method for Chrome. It finds your own tabs
  // WITHOUT needing the "tabs" permission or "host_permissions".
  if (typeof chrome.runtime.getContexts === 'function') {
    const views = await chrome.runtime.getContexts({
      contextTypes: ['TAB'],
    });

    if (views.length === 0) {
      await chrome.tabs.create(params);
    } else {
      await chrome.tabs.update(views[0].tabId, params);
    }

    return;
  }

  // ---------------------------------------------------------
  // STRATEGY B: Safari / Firefox (The "Query" API)
  // ---------------------------------------------------------
  // Fallback for browsers that don't support getContexts yet.
  // (You confirmed this works on Safari for you)
  else {
    const extensionUrlPattern = chrome.runtime.getURL('tab.html') + '*';
    const tabs = await chrome.tabs.query({ url: extensionUrlPattern });

    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      if (!tabId) {
        throw new Error('Unexpected missing tab ID');
      }
      await chrome.tabs.update(tabId, params);

      if (tabs[0].windowId) {
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      }
      return; // Done
    }
  }

  // ---------------------------------------------------------
  // FINAL FALLBACK: Create New
  // ---------------------------------------------------------
  // If neither strategy found an open tab, make a new one.
  await chrome.tabs.create(params);
}
