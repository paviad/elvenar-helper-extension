import React, { useState, useRef } from 'react';
import { UnlockedArea } from '../model/unlockedArea';
import { CityBlock } from './CityBlock';
import { MoveLogInterface } from './MoveLog/MoveLogInterface';
import { handleUndo } from './MoveLog/handleUndo';
import { handleRedo } from './MoveLog/handleRedo';

export class CityViewState {
  rMoveLog = useState<MoveLogInterface[]>([]);
  rRedoStack = useState<MoveLogInterface[]>([]);
  rDragIndex = useState<number | null>(null);
  rDragOffset = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  rOriginalPos = useState<{ x: number; y: number } | null>(null);
  rSearchTerm = useState('');
  rMenu = useState<{ key: string | number; x: number; y: number } | null>(null);
  menuRef = useRef<HTMLDivElement | null>(null);
  svgRef = useRef<SVGSVGElement>(null);
  mousePositionRef = useRef<HTMLDivElement>(null);
  allTypes;
  rBlocks;
  GridSize = 15;
  GridMax = 80;
  opacity = 0.8;
  handleUndo = () => handleUndo(this);
  handleRedo = () => handleRedo(this);

  constructor(public props: { blocks: CityBlock[]; unlockedAreas: UnlockedArea[] }) {
    this.rBlocks = useState<Record<number, CityBlock>>(props.blocks);

    // Get all unique types for color mapping
    this.allTypes = React.useMemo(() => {
      const set = new Set<string>();
      (props.blocks || []).forEach((b) => set.add(b.type));
      return Array.from(set);
    }, [props.blocks]);

    // Close menu on click outside
    React.useEffect(() => {
      if (!this.rMenu[0]) return;
      const handleClick = (e: MouseEvent) => {
        if (this.menuRef.current && !this.menuRef.current.contains(e.target as Node)) {
          this.rMenu[1](null);
        }
      };
      window.addEventListener('mousedown', handleClick);
      return () => window.removeEventListener('mousedown', handleClick);
    }, [this.rMenu[0]]);

    // Close menu on ESC key
    React.useEffect(() => {
      if (!this.rMenu[0]) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.rMenu[1](null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [this.rMenu[0]]);

    React.useEffect(() => {
      const [_, setBlocks] = this.rBlocks;
      setBlocks(this.props.blocks);
    }, [this.props.blocks]);
  }
}
