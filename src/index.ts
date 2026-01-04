import { createOverlayUi } from './overlay/createOverlayUi';

let expandFn: (state: boolean) => void;

console.log('Content script loaded');

const initFunc = async () => {
  // Remove existing panel if present
  const existingPanel = document.getElementById('elvenar-helper-draggable-panel');
  if (existingPanel) {
    existingPanel.remove();
  }

  // Create the div
  const draggableDiv = document.createElement('div');
  draggableDiv.id = 'elvenar-helper-draggable-panel';
  draggableDiv.style.position = 'fixed';
  draggableDiv.style.top = '2px';
  draggableDiv.style.left = '2px';
  draggableDiv.style.width = '250px';
  draggableDiv.style.background = '#fff';
  draggableDiv.style.border = '1px solid #ccc';
  draggableDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  draggableDiv.style.zIndex = '9999';
  draggableDiv.style.borderRadius = '6px';
  draggableDiv.style.userSelect = 'none';

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
  content.textContent = 'This is a draggable and collapsible panel.';
  draggableDiv.appendChild(content);

  document.body.appendChild(draggableDiv);

  // Drag logic
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - draggableDiv.getBoundingClientRect().left;
    offsetY = e.clientY - draggableDiv.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    draggableDiv.style.left = `${e.clientX - offsetX}px`;
    draggableDiv.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // Collapse logic
  let collapsed = true;
  collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    updateStateByCollapsed();
  });

  updateStateByCollapsed();

  function updateStateByCollapsed() {
    content.style.display = collapsed ? 'none' : '';
    svgPlus.style.display = collapsed ? '' : 'none';
    svgMinus.style.display = collapsed ? 'none' : '';
    if (collapsed) {
      // Minimize the draggableDiv width and set opacity for the collapse button
      draggableDiv.style.width = '';
      header.style.justifyContent = 'flex-end';
      title.style.display = 'none';
      iconImg.style.display = '';
      draggableDiv.style.opacity = '0.5';
      draggableDiv.title = 'Elvenar Extension Helper Window';
      collapseBtn.title = 'Expand This Panel';
    } else {
      draggableDiv.style.width = '250px';
      header.style.justifyContent = 'space-between';
      title.style.display = '';
      iconImg.style.display = '';
      draggableDiv.style.opacity = '1';
      draggableDiv.title = '';
      collapseBtn.title = 'Collapse Panel';
    }
  }

  expandFn = (state: boolean) => {
    collapsed = state;
    updateStateByCollapsed();
  };

  draggableDiv.style.display = 'block';
  draggableDiv.style.pointerEvents = 'auto';
  document.body.appendChild(draggableDiv);

  createOverlayUi(content);
};

export const expandPanel = (state: boolean) => {
  if (expandFn) {
    expandFn(!state);
  }
};

initFunc();
