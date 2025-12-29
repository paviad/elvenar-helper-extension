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
}
