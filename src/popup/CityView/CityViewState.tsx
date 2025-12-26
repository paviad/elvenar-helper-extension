import React, { useState, useRef } from 'react';
import { UnlockedArea } from '../../model/unlockedArea';
import { CityBlock } from '../CityBlock';
import { MoveLogInterface } from './MoveLog/MoveLogInterface';
import { handleUndo } from './MoveLog/handleUndo';
import { handleRedo } from './MoveLog/handleRedo';

export class CityViewState {
  rMoveLog = useState<MoveLogInterface[]>([]);
  rRedoStack = useState<MoveLogInterface[]>([]);
  rDragIndex = useState<number | null>(null);
  rDragOffset = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  rOriginalPos = useState<{ x: number; y: number } | null>(null);
  rMouseGrid = useState<{ x: number; y: number } | null>(null);
  svgRef = useRef<SVGSVGElement>(null);
  allTypes;
  rBlocks;
  GridSize = 15;
  GridMax = 80;
  opacity = 0.8;
  handleUndo = () => handleUndo(this);
  handleRedo = () => handleRedo(this);

  constructor(
    public props: { blocks: CityBlock[]; unlockedAreas: UnlockedArea[] }
  ) {
    this.rBlocks = useState<CityBlock[]>(props.blocks);

    // Get all unique types for color mapping
    this.allTypes = React.useMemo(() => {
      const set = new Set<string>();
      (props.blocks || []).forEach((b) => set.add(b.type));
      return Array.from(set);
    }, [props.blocks]);
  }
}
