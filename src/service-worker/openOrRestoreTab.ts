export async function openOrRestoreTab(accountId?: string) {
  const views = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });

  console.log('ElvenAssist: Activating accountId:', accountId);
  const params = { url: accountId ? `tab.html#/activate/?accountId=${accountId}` : 'tab.html#/city', active: true };

  if (views.length === 0) {
    chrome.tabs.create(params);
  } else {
    chrome.tabs.update(views[0].tabId, params);
  }
}
