export interface FAWaypointData {
  id: string;
  state: string;
  rankingPoints: number;
  chestIds: string[];
  lastUpdatedDetailsAt?: number;

  // --- New filtering properties ---
  color: string;
  position: number;
  isMultiColored: boolean;
}

// ============================================================================
// INTERNAL DATA STORE MODEL
// ============================================================================

export interface FAChestData {
  chestId: string;
  currentValue: number;
  maxValue: number;
  badgeType: string;
  isFullyLoaded: boolean;

  // --- New filtering properties ---
  stage: number;
  color: string;
  position: number;
  chestIndex: number;
  isMultiColored: boolean;
}
