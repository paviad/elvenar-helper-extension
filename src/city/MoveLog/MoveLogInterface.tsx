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
  type?: 'move' | 'delete' | 'duplicate';
  deletedBlock?: CityBlock;
  duplicatedBlock?: CityBlock;
}
