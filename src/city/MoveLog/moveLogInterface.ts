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
  type?: 'move' | 'delete' | 'duplicate' | 'unlock';
  deletedBlock?: CityBlock;
  duplicatedBlock?: CityBlock;
  unlockedArea?: UnlockedArea;
}
