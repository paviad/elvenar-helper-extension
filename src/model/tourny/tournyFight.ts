export interface TournyFight {
  q: number;
  r: number;
  unit: {
    __class__: 'UnitSquadVO';
    unitTypeId: string;
    size: number;
  };
}
