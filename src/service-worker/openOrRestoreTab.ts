export async function openOrRestoreTab() {
  const views = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });

  if (views.length === 0) {
    chrome.tabs.create({
      url: 'tab.html',
      active: true,
    });
  } else {
    chrome.tabs.update(views[0].tabId, { active: true });
  }
}
