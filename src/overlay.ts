import { setupCityDataUpdatedListener, setupMessageListener } from './chrome/messages';
import { getAccountById, getAccountByTabId, loadAccountManagerFromStorage } from './elvenar/AccountManager';
import { createOverlayUi } from './overlay/createOverlayUi';
import { generateOverlayStore, getOverlayStore } from './overlay/overlayStore';

let expandFn: (state: boolean) => void;
let ensureWidthAndHeightAtLeastFn: (minWidth: number, minHeight: number) => void;

console.log('ElvenAssist: Content script loaded');

const initFunc = async () => {
  // Remove existing panel if present
  const existingPanel = document.getElementById('elven-assist-draggable-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create the div
  const draggableDiv = document.createElement('div');
  draggableDiv.id = 'elven-assist-draggable-panel';
  draggableDiv.style.position = 'fixed';
  draggableDiv.style.top = '2px';
  draggableDiv.style.left = '2px';
  draggableDiv.style.width = '250px';
  draggableDiv.style.height = '450px';
  draggableDiv.style.background = '#fff';
  draggableDiv.style.border = '1px solid #ccc';
  draggableDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  draggableDiv.style.zIndex = '9999';
  draggableDiv.style.borderRadius = '6px';
  // draggableDiv.style.userSelect = 'none';
  draggableDiv.style.maxHeight = '800px';

  // Header for dragging and collapse
  const header = document.createElement('div');
  header.style.cursor = 'move';
  header.style.padding = '8px 12px';
  header.style.background = '#f5f5f5';
  header.style.color = '#333';
  header.style.borderBottom = '1px solid #eee';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  // Title
  const title = document.createElement('span');
  title.textContent = 'Helper Window';
  title.style.flexGrow = '1';
  title.style.textAlign = 'start';
  header.appendChild(title);

  // Extension icon (hidden by default, shown when collapsed)
  const iconImg = document.createElement('img');
  iconImg.src = chrome.runtime.getURL('icon32.png');
  iconImg.alt = 'Extension Icon';
  iconImg.style.cursor = 'pointer';
  iconImg.style.width = '20px';
  iconImg.style.height = '20px';
  iconImg.style.marginRight = '4px';
  iconImg.style.display = '';
  iconImg.title = 'Open City Planner';

  iconImg.addEventListener('click', async () => {
    if (isDragging) return;
    try {
      await chrome.runtime.sendMessage({ type: 'openExtensionTab' });
    } catch (error) {
      console.error('Error opening extension tab:', error);
      // Show a red cross SVG in place of the icon
      iconImg.src = '';
      iconImg.alt = 'Error';
      iconImg.style.background = 'none';
      iconImg.style.display = '';
      iconImg.style.width = '20px';
      iconImg.style.height = '20px';
      const parentNode = iconImg.parentNode;
      const nextSibling = iconImg.nextSibling;
      parentNode?.removeChild(iconImg);

      const errorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      errorSvg.setAttribute('width', '20');
      errorSvg.setAttribute('height', '20');
      errorSvg.setAttribute('viewBox', '0 0 20 20');
      errorSvg.innerHTML = `
        <circle cx="10" cy="10" r="9" fill="#fff" stroke="#e53935" stroke-width="2"/>
        <line x1="6" y1="6" x2="14" y2="14" stroke="#e53935" stroke-width="2" stroke-linecap="round"/>
        <line x1="14" y1="6" x2="6" y2="14" stroke="#e53935" stroke-width="2" stroke-linecap="round"/>
      `;
      const titleElem = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleElem.textContent = 'Extension Updated, Please Refresh the Tab';
      errorSvg.appendChild(titleElem);
      if (nextSibling) {
        parentNode?.removeChild(nextSibling);
      }
      parentNode?.appendChild(errorSvg);
    }
  });
  header.appendChild(iconImg);

  // Collapse button with inline SVG icon
  const collapseBtn = document.createElement('button');
  collapseBtn.style.border = 'none';
  collapseBtn.style.background = 'transparent';
  collapseBtn.style.fontSize = '18px';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.style.lineHeight = '1';
  collapseBtn.style.display = 'flex';
  collapseBtn.style.alignItems = 'center';
  // SVG icons
  const svgPlus = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgPlus.setAttribute('width', '18');
  svgPlus.setAttribute('height', '18');
  svgPlus.setAttribute('viewBox', '0 0 18 18');
  svgPlus.innerHTML =
    '<rect x="8" y="3" width="2" height="12" fill="currentColor"/><rect x="3" y="8" width="12" height="2" fill="currentColor"/>';
  svgPlus.style.display = 'none';

  const svgMinus = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgMinus.setAttribute('width', '18');
  svgMinus.setAttribute('height', '18');
  svgMinus.setAttribute('viewBox', '0 0 18 18');
  svgMinus.innerHTML = '<rect x="3" y="8" width="12" height="2" fill="currentColor"/>';
  svgMinus.style.display = '';

  collapseBtn.appendChild(svgPlus);
  collapseBtn.appendChild(svgMinus);
  header.appendChild(collapseBtn);

  draggableDiv.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.padding = '12px';
  content.style.color = '#333';
  content.style.height = 'calc(100% - 140px)';
  content.textContent = 'This is a draggable and collapsible panel.';
  draggableDiv.appendChild(content);
  // Add resize handle for resizable panel
  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.right = '0';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.width = '16px';
  resizeHandle.style.height = '16px';
  resizeHandle.style.cursor = 'nwse-resize';
  resizeHandle.style.background = 'transparent';
  resizeHandle.style.zIndex = '10000';
  resizeHandle.style.borderBottomRightRadius = '6px';
  resizeHandle.style.display = 'none';
  resizeHandle.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><line x1="4" y1="12" x2="12" y2="4" stroke="#aaa" stroke-width="2"/><line x1="8" y1="14" x2="14" y2="8" stroke="#aaa" stroke-width="2"/></svg>`;
  draggableDiv.appendChild(resizeHandle);

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    if (collapsed) return;
    if (!document.defaultView) return;
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(draggableDiv).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(draggableDiv).height, 10);
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.max(180, startWidth + (e.clientX - startX));
    const newHeight = Math.max(60, startHeight + (e.clientY - startY));
    draggableDiv.style.width = newWidth + 'px';
    draggableDiv.style.height = newHeight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.userSelect = '';
    }
  });

  document.body.appendChild(draggableDiv);

  // Drag logic
  let isDragging = false;
  let maybeDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    maybeDragging = true;
    offsetX = e.clientX - draggableDiv.getBoundingClientRect().left;
    offsetY = e.clientY - draggableDiv.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging && !maybeDragging) return;
    if (!isDragging && maybeDragging) {
      isDragging = true;
      maybeDragging = false;
    }
    draggableDiv.style.left = `${e.clientX - offsetX}px`;
    draggableDiv.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      // Delay to prevent click event after drag
      isDragging = false;
    }, 0);
    maybeDragging = false;
    document.body.style.userSelect = '';
  });

  // Collapse logic
  let collapsed = true;
  let lastExpandedWidth = '250px';
  let lastExpandedHeight = '450px';
  collapseBtn.addEventListener('click', () => {
    if (isDragging) return;
    if (!collapsed) {
      // About to collapse, save current size
      lastExpandedWidth = draggableDiv.style.width || '250px';
      lastExpandedHeight = draggableDiv.style.height || '450px';
    }
    collapsed = !collapsed;
    updateStateByCollapsed();
  });

  updateStateByCollapsed();

  function updateStateByCollapsed() {
    content.style.display = collapsed ? 'none' : '';
    svgPlus.style.display = collapsed ? '' : 'none';
    svgMinus.style.display = collapsed ? 'none' : '';

    getOverlayStore()?.getState().setOverlayExpanded(!collapsed);

    if (collapsed) {
      // Minimize the draggableDiv width and set opacity for the collapse button
      draggableDiv.style.width = '';
      draggableDiv.style.height = '';
      header.style.justifyContent = 'flex-end';
      title.style.display = 'none';
      iconImg.style.display = '';
      draggableDiv.style.opacity = '0.5';
      draggableDiv.title = 'ElvenAssist Helper Window';
      collapseBtn.title = 'Expand This Panel';
      resizeHandle.style.display = 'none';
    } else {
      draggableDiv.style.width = lastExpandedWidth;
      draggableDiv.style.height = lastExpandedHeight;
      header.style.justifyContent = 'space-between';
      title.style.display = '';
      iconImg.style.display = '';
      draggableDiv.style.opacity = '1';
      draggableDiv.title = '';
      collapseBtn.title = 'Collapse Panel';
      resizeHandle.style.display = '';

      getOverlayStore()?.getState().triggerForceUpdate();
    }
  }

  expandFn = (state: boolean) => {
    if (!state) {
      // About to expand, restore last size
      draggableDiv.style.width = lastExpandedWidth;
      draggableDiv.style.height = lastExpandedHeight;
    }
    collapsed = state;
    updateStateByCollapsed();
  };

  ensureWidthAndHeightAtLeastFn = (minWidth: number, minHeight: number) => {
    const currentWidth = parseInt(draggableDiv.style.width, 10) || 0;
    if (!collapsed && currentWidth < minWidth) {
      draggableDiv.style.width = `${minWidth}px`;
    } else if (parseInt(lastExpandedWidth, 10) < minWidth) {
      lastExpandedWidth = `${minWidth}px`;
    }
    const currentHeight = parseInt(draggableDiv.style.height, 10) || 0;
    if (!collapsed && currentHeight < minHeight) {
      draggableDiv.style.height = `${minHeight}px`;
    } else if (parseInt(lastExpandedHeight, 10) < minHeight) {
      lastExpandedHeight = `${minHeight}px`;
    }
  };

  draggableDiv.style.display = 'block';
  draggableDiv.style.pointerEvents = 'auto';
  document.body.appendChild(draggableDiv);

  setupMessageListener();
  setupCityDataUpdatedListener(({ tabId }) => {
    setup(tabId, content);
  });
};

async function setup(tabId: number, contentDiv: HTMLDivElement) {
  await loadAccountManagerFromStorage();
  const accountId = getAccountByTabId(tabId);
  if (accountId) {
    generateOverlayStore(accountId);
    const store = getOverlayStore();
    store.persist.onFinishHydration(async (state) => {
      const chapter = (await getAccountById(accountId))?.cityQuery?.chapter || 0;
      state.setChapter(chapter);

      if(!state.lastSeenChat) {
        // First time setup, set last seen chat to now
        state.setLastSeenChat(Date.now());
      }

      createOverlayUi(contentDiv);
    });
  }
}

export const expandPanel = (state: boolean) => {
  if (expandFn) {
    expandFn(!state);
  }
};

export const ensureMinWidthAndHeight = (minWidth: number, minHeight: number) => {
  if (ensureWidthAndHeightAtLeastFn) {
    ensureWidthAndHeightAtLeastFn(minWidth, minHeight);
  }
};

initFunc();

injectScriptTag();

function injectScriptTag() {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL('elvenassist-inject.bundle.js'));
  (document.head || document.documentElement).appendChild(script);
}
