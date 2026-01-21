export interface StageProvision {
  baseName: string;
  stages: Stage[];
}
export interface Stage {
  id: number;
  culture?: number;
  population?: number;
}
