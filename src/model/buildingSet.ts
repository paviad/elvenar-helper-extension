/** A set of buildings that reward standing side by side, as the game's `SetBuildings` file lists it. */
export interface BuildingSet {
  id: string;
  name: string;
  pieces: BuildingSetPiece[];
}

export interface BuildingSetPiece {
  /** The building's name without its level, as in `A_Evt_Set_Seasons_XXV_The_Quiet_Shade`. */
  baseName: string;
  /** What the piece gives for each number of pieces of the set touching it. */
  bonuses: { adjacencyCount: number; type: string; factor: number }[];
}
