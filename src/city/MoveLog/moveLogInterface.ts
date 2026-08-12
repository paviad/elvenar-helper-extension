import { UnlockedArea } from '../../model/unlockedArea';
import { CityBlock } from '../CityBlock';

export interface MoveLogInterface {
  id: number;
  name: string;
  from: {
    x: number;
    y: number;
  };
  to: {
    x: number;
    y: number;
  };
  movedChanged: boolean;
  type?: 'move' | 'delete' | 'duplicate' | 'unlock' | 'level';
  deletedBlock?: CityBlock;
  duplicatedBlock?: CityBlock;
  unlockedArea?: UnlockedArea;
  /** For a 'level' entry: the block on either side of the change. It keeps its id and its
   * place, so undo and redo are a straight swap of the two. */
  previousBlock?: CityBlock;
  nextBlock?: CityBlock;
}
