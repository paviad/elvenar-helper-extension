import { Divider, List, ListItemButton, ListItemText, Paper } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom';
import { CityBlock } from '../CityBlock';

interface CityContextMenuProps {
  menu: { x: number; y: number; key: string | number };
  svgRef: React.RefObject<SVGSVGElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeLevel: () => void;
  block?: CityBlock;
}

// Helper to convert SVG coordinates to page coordinates
function svgToPageCoords(svg: SVGSVGElement | null, x: number, y: number) {
  if (!svg) return { left: x, top: y };
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const screenCTM = svg.getScreenCTM();
  if (!screenCTM) return { left: x, top: y };
  const transformed = pt.matrixTransform(screenCTM);
  return {
    left: transformed.x + window.scrollX,
    top: transformed.y + window.scrollY,
  };
}

export const CityContextMenu: React.FC<CityContextMenuProps> = ({
  menu,
  svgRef,
  menuRef,
  onDuplicate,
  onDelete,
  onChangeLevel,
  block,
}) => {
  const svgElem = svgRef.current;
  const coords = svgToPageCoords(svgElem, menu.x, menu.y);

  // Render menu as a portal to body
  return ReactDOM.createPortal(
    <Paper
      ref={menuRef}
      elevation={4}
      sx={{
        position: 'absolute',
        left: coords.left,
        top: coords.top,
        minWidth: 140,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <List dense disablePadding>
        <ListItemButton onClick={onDuplicate}>
          <ListItemText primary='Duplicate' />
        </ListItemButton>
        <Divider />
        <ListItemButton onClick={onDelete}>
          <ListItemText primary='Delete' />
        </ListItemButton>
        <Divider />
        {block && /^[GPRHMOYDBZ]_/.test(block.gameId) && (
          <ListItemButton onClick={onChangeLevel}>
            <ListItemText primary='Change Level' />
          </ListItemButton>
        )}
      </List>
    </Paper>,
    document.body,
  );
};
