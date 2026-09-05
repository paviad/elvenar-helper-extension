import { setupAggregateRequestResponseListener } from './chrome/aggregateRequestResponse';
import { onExtensionContextLost, reportPossibleContextLoss, watchExtensionContext } from './chrome/extensionContext';
import { requestRuntime, setListener, setupMessageListener } from './chrome/messages';
import { setupSocketResponseListener } from './chrome/socketResponse';
import { getAccountById, getAccountByTabId, loadAllAccounts } from './elvenar/accountStore';
import { GameVars } from './inject/gameVars';
import { setupColumnListener } from './overlay/columnWatch';
import { createOverlayUi } from './overlay/createOverlayUi';
import { setupEventChestListener } from './overlay/eventChestWatch';
import { setupGameStateListener } from './overlay/gameStateWatch';
import {
  loadOverlaySize,
  OVERLAY_SIZE_PRESETS,
  OverlaySize,
  OverlaySizePreset,
  saveOverlaySize,
} from './overlay/overlaySize';
import { generateOverlayStore, getAccountId, getOverlayStore } from './overlay/overlayStore';
import { getProductionWatchStatus, subscribeToProductionWatch } from './overlay/productionWatcher';
import { reportGameClientScript, reportGameRenderConfig } from './overlay/reportGameClientScript';
import { setupNonSpecificRequestInterceptedListener } from './overlay/setupNonSpecificRequestInterceptedListener';
import { updateSpireBadge } from './overlay/spireBadge';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

let expandFn: (state: boolean) => void;
let ensureWidthAndHeightAtLeastFn: (minWidth: number, minHeight: number) => void;
let applySizePresetFn: (preset: OverlaySizePreset) => void;
let getSizeFn: () => OverlaySize | undefined;

console.log('ElvenAssist: Content script loaded');

/**
 * The panel's ceiling. The resize drag clamps to it as well as the CSS, so `style.height` can
 * never claim a height the panel does not render: overshooting used to leave the two disagreeing,
 * and dragging back up then did nothing until the cursor re-crossed the ceiling.
 */
const MAX_PANEL_HEIGHT = 800;

/** Matches MUI's small IconButton, so the hand-built buttons and the React ones are one size. */
const HEADER_BUTTON_SIZE = 30;

const REFRESH_REQUIRED_TITLE = 'Extension Updated, Please Refresh the Tab';

/** The header's buttons are built by hand here and by MUI in React; this is what makes them match. */
function styleAsHeaderButton(el: HTMLElement) {
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.width = `${HEADER_BUTTON_SIZE}px`;
  el.style.height = `${HEADER_BUTTON_SIZE}px`;
  el.style.flex = '0 0 auto';
  el.style.padding = '0';
  el.style.border = 'none';
  el.style.background = 'transparent';
  el.style.borderRadius = '50%';
  el.style.color = '#333';
  el.style.cursor = 'pointer';
  // Inline rather than a stylesheet: this panel is injected into the game's page, so it carries
  // no CSS of its own, and MUI's buttons next to these do highlight on hover.
  el.addEventListener('mouseenter', () => {
    el.style.background = 'rgba(0, 0, 0, 0.06)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.background = 'transparent';
  });
}

// This branch opens at the large preset rather than master's small default, which is too tight
// for the extra views. Taken from the preset so the two cannot drift into a third size.
const { width: defaultStartingWidth, height: defaultStartingHeight } = OVERLAY_SIZE_PRESETS.large;

let gameVars: GameVars | undefined;
let resolveGameVars: (vars: GameVars) => void;
/**
 * The panel is built only once these are in. They used to be read the moment the store hydrated,
 * and if they were not there yet the build threw - inside zustand's hydration, which swallows it -
 * so the hourglass went, the panel opened and closed, and it held no tabs until a lucky refresh.
 */
const gameVarsReady = new Promise<GameVars>((resolve) => {
  resolveGameVars = resolve;
});

const setupGameVarsListener = () => {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'gameVars') {
      return;
    }

    gameVars = event.data.payload as GameVars;
    resolveGameVars(gameVars);

    console.log('gameVars', gameVars);
  });
  // The page announces them once the game script is patched, which can be before this script
  // runs; asking makes it say them again. Unanswered if the game is not patched yet - its own
  // announcement then comes later, to a listener that is already here.
  window.postMessage({ type: 'requestGameVars' }, '*');
};

const initFunc = () => {
  // Remove existing panel if present
  const existingPanel = document.getElementById('elven-assist-draggable-panel');
  if (existingPanel) {
    existingPanel.remove();
  } else {
    setupNonSpecificRequestInterceptedListener();
    setupAggregateRequestResponseListener();
    setupSocketResponseListener();
    reportGameClientScript();
    reportGameRenderConfig();
    setupGameVarsListener();
    setupGameStateListener();
    setupColumnListener();
    setupEventChestListener();
  }

  // Create the div
  const draggableDiv = document.createElement('div');
  draggableDiv.id = 'elven-assist-draggable-panel';
  draggableDiv.style.position = 'fixed';
  draggableDiv.style.top = '2px';
  draggableDiv.style.left = '2px';
  draggableDiv.style.width = `${defaultStartingWidth}px`;
  draggableDiv.style.height = `${defaultStartingHeight}px`;
  draggableDiv.style.background = '#fff';
  draggableDiv.style.border = '1px solid #ccc';
  draggableDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  draggableDiv.style.zIndex = '9999';
  draggableDiv.style.borderRadius = '6px';
  // draggableDiv.style.userSelect = 'none';
  draggableDiv.style.maxHeight = `${MAX_PANEL_HEIGHT}px`;

  // Header for dragging and collapse
  const header = document.createElement('div');
  header.style.cursor = 'move';
  header.style.padding = '3px 6px 3px 12px';
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

  // Every control in the header sits in this one row, so they line up by layout instead of by
  // hand-tuned offsets. The React buttons go in a slot at its start; the extension icon and the
  // collapse toggle are built here because they have to work before React ever mounts - React
  // only appears once the game has sent city data.
  const headerActions = document.createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.alignItems = 'center';
  headerActions.style.gap = '2px';
  // The header is the drag surface, so a press that lands on a button must not also arm a drag.
  headerActions.addEventListener('mousedown', (e) => e.stopPropagation());

  const reactHeaderActions = document.createElement('div');
  reactHeaderActions.style.display = 'flex';
  reactHeaderActions.style.alignItems = 'center';
  headerActions.appendChild(reactHeaderActions);

  // Until the game sends city data there is no store, no React and no content - collapsed, the
  // panel is just an icon and a plus, with nothing to say it is still coming up. The hourglass
  // fills that gap and is removed the moment the data lands.
  const waitingIcon = document.createElement('div');
  styleAsHeaderButton(waitingIcon);
  waitingIcon.style.cursor = 'default';
  waitingIcon.title = 'Waiting for city data...';
  // Sized like a header button so the row stays even, but it is not one: this cancels the hover
  // highlight the styling adds, so it does not read as something to click.
  waitingIcon.addEventListener('mouseenter', () => {
    waitingIcon.style.background = 'transparent';
  });

  const svgHourglass = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgHourglass.setAttribute('width', '18');
  svgHourglass.setAttribute('height', '18');
  svgHourglass.setAttribute('viewBox', '0 0 24 24');
  svgHourglass.innerHTML =
    '<path fill="currentColor" d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>';
  waitingIcon.appendChild(svgHourglass);
  // Animated through the Web Animations API rather than a keyframes rule: the panel is injected
  // into the game's page and carries no stylesheet of its own. The shape is symmetric under a
  // half turn, so the jump back to 0 at the end of each iteration is invisible.
  waitingIcon.animate(
    [{ transform: 'rotate(0deg)' }, { offset: 0.7, transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }],
    { duration: 2000, iterations: Infinity },
  );
  headerActions.appendChild(waitingIcon);

  // Extension icon, in its own button-sized box so it lines up with the rest of the row.
  const iconButton = document.createElement('div');
  styleAsHeaderButton(iconButton);
  iconButton.title = 'Open City Planner';

  const iconImg = document.createElement('img');
  iconImg.src = chrome.runtime.getURL('icon32.png');
  iconImg.alt = 'Extension Icon';
  iconImg.style.width = '20px';
  iconImg.style.height = '20px';

  // Swap the icon for a red cross: the extension is out of reach and only reloading the tab will
  // bring it back. Called both by a send that failed and by the watch that spots the context going
  // away on its own, so it has to survive being called twice - the second call must not strip an
  // icon that is no longer there.
  let refreshRequired = false;
  function showRefreshRequired() {
    if (refreshRequired) return;
    refreshRequired = true;

    // Whatever we were waiting on is not coming now.
    waitingIcon.remove();

    // The cross swaps inside the icon's own box, so the rest of the row - including the collapse
    // toggle - is untouched.
    iconImg.remove();

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
    titleElem.textContent = REFRESH_REQUIRED_TITLE;
    errorSvg.appendChild(titleElem);
    iconButton.appendChild(errorSvg);
    iconButton.title = REFRESH_REQUIRED_TITLE;
  }

  iconButton.addEventListener('click', () => {
    if (isDragging) return;
    void (async () => {
      try {
        await requestRuntime('openExtensionTab');
      } catch (error) {
        console.error('Error opening extension tab:', error);
        reportPossibleContextLoss(error);
        showRefreshRequired();
      }
    })();
  });
  iconButton.appendChild(iconImg);
  headerActions.appendChild(iconButton);

  // Collapse button with inline SVG icon
  const collapseBtn = document.createElement('button');
  styleAsHeaderButton(collapseBtn);
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
  headerActions.appendChild(collapseBtn);

  header.appendChild(headerActions);

  draggableDiv.appendChild(header);

  // Whether the Production tab is currently driving the city, for when the panel is collapsed and
  // its own status chip is out of sight. Collapsed, this is the only thing on screen that says
  // the extension is acting on its own - so it sits outside the fade the collapsed panel gets
  // (see `updateStateByCollapsed`) rather than being washed out along with everything else.
  const automationDot = document.createElement('div');
  automationDot.style.position = 'absolute';
  automationDot.style.top = '5px';
  automationDot.style.left = '5px';
  automationDot.style.width = '8px';
  automationDot.style.height = '8px';
  automationDot.style.borderRadius = '50%';
  automationDot.style.pointerEvents = 'none';
  draggableDiv.appendChild(automationDot);

  const showAutomationDot = (running: boolean) => {
    automationDot.style.background = running ? '#e53935' : '#bdbdbd';
    automationDot.style.boxShadow = running ? '0 0 3px rgba(229,57,53,0.9)' : 'none';
    automationDot.title = running ? 'Production monitoring is running' : 'Production monitoring is stopped';
  };

  showAutomationDot(getProductionWatchStatus().running);
  subscribeToProductionWatch((status) => showAutomationDot(status.running));

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
  // Set once the user has resized the panel or picked a preset, so the saved size arriving late
  // from storage cannot undo a choice they have already made in this page.
  let sizeChosenThisSession = false;

  resizeHandle.addEventListener('pointerdown', (e) => {
    if (collapsed) return;
    if (!document.defaultView) return;
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(draggableDiv).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(draggableDiv).height, 10);
    // Capturing the pointer is what guarantees we hear the release. The panel stops growing at
    // MAX_PANEL_HEIGHT while the cursor carries on down, so a downward drag very easily ends
    // outside the browser window - and a mouseup out there is never delivered to the page. The
    // old document-level mouseup therefore missed it, leaving the panel in resize mode, tracking
    // a cursor with no button held.
    resizeHandle.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  // Capture delivers these to the handle wherever the pointer has got to, so they belong here
  // rather than on the document.
  resizeHandle.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    // A pointer that comes back with nothing held was released somewhere we never heard about.
    if (e.buttons === 0) {
      endResize();
      return;
    }
    const newWidth = Math.max(180, startWidth + (e.clientX - startX));
    const newHeight = Math.min(MAX_PANEL_HEIGHT, Math.max(60, startHeight + (e.clientY - startY)));
    draggableDiv.style.width = newWidth + 'px';
    draggableDiv.style.height = newHeight + 'px';
  });

  resizeHandle.addEventListener('pointerup', endResize);
  resizeHandle.addEventListener('pointercancel', endResize);

  function endResize() {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.userSelect = '';
    rememberCurrentSize();
  }

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
    // Same trap as the resize: a release outside the window never reaches the mouseup below, and
    // the panel would then follow the bare cursor. Nothing held means the drag is over.
    if (e.buttons === 0) {
      endDrag();
      return;
    }
    if (!isDragging && maybeDragging) {
      isDragging = true;
      maybeDragging = false;
    }
    draggableDiv.style.left = `${e.clientX - offsetX}px`;
    draggableDiv.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', endDrag);

  function endDrag() {
    setTimeout(() => {
      // Delay to prevent click event after drag
      isDragging = false;
    }, 0);
    maybeDragging = false;
    document.body.style.userSelect = '';
  }

  // Collapse logic
  let collapsed = true;
  let lastExpandedWidth = `${defaultStartingWidth}px`;
  let lastExpandedHeight = `${defaultStartingHeight}px`;
  collapseBtn.addEventListener('click', () => {
    if (isDragging) return;
    if (!collapsed) {
      // About to collapse, save current size
      lastExpandedWidth = draggableDiv.style.width || lastExpandedWidth;
      lastExpandedHeight = draggableDiv.style.height || lastExpandedHeight;
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

    // The React buttons act on the panel's content, so they follow it out of sight when it is
    // collapsed. They used to be part of the content and hidden with it; now that they live in
    // the header they have to be hidden explicitly.
    reactHeaderActions.style.display = collapsed ? 'none' : 'flex';

    // The collapsed panel's half-fade used to be one `opacity` on the whole panel, which would
    // have taken the automation dot down with it - and a washed-out pink dot is no use as the one
    // thing saying the extension is driving the city. Faded piece by piece instead, to the same
    // effect: the header's contents, and the panel's own background, border and shadow.
    // The border is left alone on purpose: a `full` game bundle marks itself with a 13px red one
    // (see `setupOverlayStore`), and fading it here would take the colour off that on the first
    // collapse and leave a 13px band of nothing.
    automationDot.style.display = collapsed ? '' : 'none';
    header.style.opacity = collapsed ? '0.5' : '1';
    draggableDiv.style.background = collapsed ? 'rgba(255,255,255,0.5)' : '#fff';
    draggableDiv.style.boxShadow = collapsed ? '0 2px 8px rgba(0,0,0,0.075)' : '0 2px 8px rgba(0,0,0,0.15)';

    if (collapsed) {
      // Minimize the draggableDiv width
      draggableDiv.style.width = '';
      draggableDiv.style.height = '';
      header.style.justifyContent = 'flex-end';
      title.style.display = 'none';
      draggableDiv.title = 'ElvenAssist Helper Window';
      collapseBtn.title = 'Expand This Panel';
      resizeHandle.style.display = 'none';
    } else {
      draggableDiv.style.width = lastExpandedWidth;
      draggableDiv.style.height = lastExpandedHeight;
      header.style.justifyContent = 'space-between';
      title.style.display = '';
      draggableDiv.title = '';
      collapseBtn.title = 'Collapse Panel';
      resizeHandle.style.display = '';

      getOverlayStore()?.getState().triggerForceUpdate();
    }
  }

  /**
   * The size as rendered, which is the size the panel actually has: it is clamped by the panel's
   * own max-height, so dragging past the bottom limit stores what is on screen rather than the
   * larger number the drag asked for.
   */
  function readRenderedSize(): OverlaySize | undefined {
    const view = document.defaultView;
    if (!view) return undefined;
    const style = view.getComputedStyle(draggableDiv);
    const width = parseInt(style.width, 10);
    const height = parseInt(style.height, 10);
    if (!width || !height) return undefined;
    return { width, height };
  }

  function applySize(size: OverlaySize) {
    lastExpandedWidth = `${size.width}px`;
    lastExpandedHeight = `${size.height}px`;
    if (!collapsed) {
      draggableDiv.style.width = lastExpandedWidth;
      draggableDiv.style.height = lastExpandedHeight;
    }
  }

  function rememberCurrentSize() {
    const size = readRenderedSize();
    if (!size) return;
    sizeChosenThisSession = true;
    lastExpandedWidth = `${size.width}px`;
    lastExpandedHeight = `${size.height}px`;
    saveOverlaySize(size);
  }

  // Storage is async, so the panel is created at the default size and corrected once the read
  // lands. Only the size the user chose is saved, so a view that grew the panel to fit itself
  // does not quietly become the remembered size.
  void loadOverlaySize().then((saved) => {
    if (saved && !sizeChosenThisSession) {
      applySize(saved);
    }
  });

  applySizePresetFn = (preset: OverlaySizePreset) => {
    sizeChosenThisSession = true;
    const size = OVERLAY_SIZE_PRESETS[preset];
    applySize(size);
    saveOverlaySize(size);
  };

  getSizeFn = () => (collapsed ? undefined : readRenderedSize());

  expandFn = (state: boolean) => {
    if (collapsed === state) return; // No change needed
    if (!state) {
      // About to expand, restore last size
      draggableDiv.style.width = lastExpandedWidth;
      draggableDiv.style.height = lastExpandedHeight;
    } else {
      // About to collapse, save current size
      lastExpandedWidth = draggableDiv.style.width || lastExpandedWidth;
      lastExpandedHeight = draggableDiv.style.height || lastExpandedHeight;
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

  // The extension can be reloaded, updated or disabled at any moment, and this script would carry
  // on with no way to reach it and no reason to say so. Watching for that means the cross appears
  // by itself rather than waiting for someone to click the icon and find out the hard way.
  onExtensionContextLost(showRefreshRequired);
  watchExtensionContext();

  setupMessageListener();
  setListener('cityDataUpdated', ({ tabId }) => {
    waitingIcon.remove();
    setup(tabId, content, reactHeaderActions).catch((err) => {
      console.error('Error setting up overlay:', err);
    });
  });
  setListener('retrievingCounterUpdate', ({ retrievingCounter, abandoned }) => {
    const store = getOverlayStore();
    store.getState().setRetrievingCounter(retrievingCounter, abandoned);
  });
  setListener('worldNeighborsUpdated', ({ worldNeighbors }) => {
    const store = getOverlayStore();
    console.log('received world neighbors', worldNeighbors.filter((r) => r.cool_down).length);
    store.getState().setWorldNeighbors(worldNeighbors);
  });
  setListener('initialWorldMapData', ({ initialWorldMapData }) => {
    const store = getOverlayStore();
    store.getState().setInitialWorldMapData(initialWorldMapData);
  });
  setListener('neighbourHelpData', ({ neighbourHelpData }) => {
    const store = getOverlayStore();
    store.getState().setNeighbourHelpData(neighbourHelpData);
  });
  setListener('helpPerformedUpdateProvince', ({ updatedProvince }) => {
    const store = getOverlayStore();
    store.getState().applyNeighborProvinceUpdate(updatedProvince);
  });
  setListener('spirePicks', ({ picks, prob, jokerGhost, turn, status }) => {
    // On a fresh encounter there is no prob yet (the wizard only computes it from turn 2)
    // and no joker, so the badge clears itself.
    updateSpireBadge({ prob, jokerGhost, turn, status });
    if (status) {
      // Progress signal only — relaying it would hand the page an empty pick list and
      // release whatever is waiting on the real one.
      return;
    }
    const message = {
      type: 'spirePicks',
      payload: picks,
    };
    window.postMessage(message, '*');
  });
};

async function setup(tabId: number, contentDiv: HTMLDivElement, headerActionsSlot: HTMLDivElement) {
  await loadAllAccounts();
  const accountId = getAccountByTabId(tabId);
  if (!accountId) {
    return;
  }

  // Startup data is delivered again whenever the game re-syncs, so this runs more than once per
  // page. Only the first run builds anything; the later ones just take across what the fresh
  // startup data can change, since hydration has long finished and the panel is already up.
  const alreadySetUp = getAccountId() === accountId;
  const store = generateOverlayStore(accountId);

  if (alreadySetUp) {
    store.getState().setChapter(getAccountById(accountId)?.cityQuery?.chapter || 0);
    return;
  }

  store.persist.onFinishHydration((state) => {
    const chapter = getAccountById(accountId)?.cityQuery?.chapter || 0;
    state.setChapter(chapter);
    // The panel can be opened while the hourglass is still up, before there was a store to tell.
    state.setOverlayExpanded(getOverlaySize() !== undefined);

    if (!state.lastSeenChat) {
      // First time setup, set last seen chat to now
      state.setLastSeenChat(Date.now());
    }

    if (!gameVars) {
      console.warn('gameVars not in yet, the panel waits for them');
    }
    void gameVarsReady.then((vars) => {
      state.setGameVars(vars);
      const existingPanel = document.getElementById('elven-assist-draggable-panel');
      if (existingPanel) {
        if (vars.gameScriptUrl.includes('full')) {
          existingPanel.style.border = '13px solid red';
        } else {
          // existingPanel.style.border = '13px solid green';
        }
      }

      createOverlayUi(contentDiv, headerActionsSlot);
    });
  });
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

/** Resize the panel to one of the presets and remember it for the next page load. */
export const setOverlaySizePreset = (preset: OverlaySizePreset) => {
  if (applySizePresetFn) {
    applySizePresetFn(preset);
  }
};

/** The panel's current size, or undefined while it is collapsed. */
export const getOverlaySize = (): OverlaySize | undefined => (getSizeFn ? getSizeFn() : undefined);

initFunc();
