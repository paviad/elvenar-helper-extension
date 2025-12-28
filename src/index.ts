import { createOverlayUi } from './overlay/createOverlayUi';

let expandFn: (state: boolean) => void;

console.log('Content script loaded');
window.addEventListener('load', async () => {
  // Create the div
  const draggableDiv = document.createElement('div');
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
  header.appendChild(title);

  // Collapse button
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = '−';
  collapseBtn.style.border = 'none';
  collapseBtn.style.background = 'transparent';
  collapseBtn.style.fontSize = '18px';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.style.lineHeight = '1';
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
    collapseBtn.textContent = collapsed ? '+' : '-';
  }

  expandFn = (state: boolean) => {
    collapsed = state;
    updateStateByCollapsed();
  };

  draggableDiv.style.display = 'block';
  draggableDiv.style.pointerEvents = 'auto';
  document.body.appendChild(draggableDiv);

  createOverlayUi(content);
});

export const expandPanel = (state: boolean) => {
  if (expandFn) {
    expandFn(!state);
  }
};
