// ============================================================================
// API RESPONSE TYPINGS (Based on provided JSON)
// ============================================================================

import { INITIAL_FA_CHESTS } from './faConstants'; // Adjust this import to match your filename
import { FAChestData, FAWaypointData } from './FAWaypointData';

export interface WaypointVO {
  __class__: 'WaypointVO';
  id: string;
  chestIds: string[];
  state: 'locked' | 'unlocked' | 'completed';
  rankingPoints: number;
}

export interface ChestPayInProgressVO {
  __class__: 'ChestPayInProgressVO';
  chestId: string;
  currentValue: number;
  maxValue: number;
  costs: {
    __class__: 'ChestCostsVO';
    chestId: string;
    costs: {
      __class__: 'CityResourceVO';
      resources: {
        __class__: 'Dictionary';
        [badgeName: string]: number | string;
      };
    };
    premiumCostPerOne: number;
  };
}

export interface FAStoreData {
  waypoints: Record<string, FAWaypointData>;
  chests: Record<string, FAChestData>;
  currentStage: number;
}

// export const faDataStore: FAStoreData = {
//   waypoints: {},
//   chests: {},
// };

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Processes the high-level map overview when the FA map is opened.
 * Populates waypoints and initializes empty chest references with parsed metadata.
 */
export const processFaMapOverview = (faDataStore: FAStoreData, overviewData: WaypointVO[]) => {
  if (!Array.isArray(overviewData)) return;

  overviewData.forEach((waypoint) => {
    // 1. Extract color and position from the waypoint ID (e.g. "orange_3")
    let color = 'unknown';
    let position = -1;

    if (waypoint.id === 'stage_start') {
      color = 'start';
      position = 0;
    } else {
      const parts = waypoint.id.split('_');
      if (parts.length >= 2) {
        color = parts[0];
        position = parseInt(parts[1], 10);
      }
    }

    // Positions 3 and 6 are multi-colored crossroad nodes
    const isMultiColored = position === 3 || position === 6;

    // 2. Update or insert the waypoint
    faDataStore.waypoints[waypoint.id] = {
      id: waypoint.id,
      state: waypoint.state,
      rankingPoints: waypoint.rankingPoints,
      chestIds: waypoint.chestIds || [],
      color,
      position,
      isMultiColored,
      lastUpdatedDetailsAt: faDataStore.waypoints[waypoint.id]?.lastUpdatedDetailsAt,
    };

    // 3. Initialize entries for chests, merging in scraped initial data if available
    waypoint.chestIds.forEach((chestId) => {
      if (!faDataStore.chests[chestId]) {
        let stage = 0;
        let chestIndex = 0;

        const match = chestId.match(/^mpe_i_(\d+)_(.+)_(\d+)$/);
        if (match) {
          stage = parseInt(match[1], 10);
          chestIndex = parseInt(match[3], 10);
        }

        // Fetch our scraped default data for this specific chest
        const defaultData = INITIAL_FA_CHESTS[chestId];
        const maxValue = defaultData ? defaultData.maxValue : 0;
        const badgeType = defaultData ? defaultData.badgeType : 'unknown';

        // Auto-fill completed nodes so the UI immediately shows 100% progress
        const isCompleted = waypoint.state === 'completed';
        const currentValue = isCompleted ? maxValue : 0;

        faDataStore.chests[chestId] = {
          chestId,
          currentValue,
          maxValue,
          badgeType,
          // If we successfully pulled from defaults, it is "fully loaded" for rendering purposes
          isFullyLoaded: !!defaultData,
          stage,
          color,
          position,
          chestIndex,
          isMultiColored,
        };
      } else if (waypoint.state === 'completed') {
        // If the chest existed but the waypoint just became completed, max it out
        faDataStore.chests[chestId].currentValue = faDataStore.chests[chestId].maxValue;
      }
    });
  });
};

/**
 * Processes the detailed chest data when a specific node is clicked.
 */
export const processFaNodeDetails = (faDataStore: FAStoreData, nodeDetailsData: ChestPayInProgressVO[]) => {
  if (!Array.isArray(nodeDetailsData)) return;

  const now = Date.now();
  const updatedWaypointIds = new Set<string>();

  nodeDetailsData.forEach((chestDetails) => {
    let parentWaypointId: string | null = null;

    // 1. Identify which waypoint this chest belongs to FIRST
    for (const waypoint of Object.values(faDataStore.waypoints)) {
      if (waypoint.chestIds.includes(chestDetails.chestId)) {
        parentWaypointId = waypoint.id;
        break;
      }
    }

    // 2. Ignore unrelated chests not present in the current map overview
    if (!parentWaypointId) {
      return;
    }

    // 3. Extract the badge string (e.g., 'golden_bracelet')
    const resources = chestDetails.costs?.costs?.resources || {};
    const badgeType = Object.keys(resources).find((key) => key !== '__class__') || 'unknown';

    // 4. Merge detailed data into the chest store safely
    // (It retains the metadata like color, position, and stage initialized by the overview)
    faDataStore.chests[chestDetails.chestId] = {
      ...faDataStore.chests[chestDetails.chestId],
      chestId: chestDetails.chestId,
      currentValue: chestDetails.currentValue,
      maxValue: chestDetails.maxValue,
      badgeType: badgeType,
      isFullyLoaded: true,
    };

    updatedWaypointIds.add(parentWaypointId);
  });

  // 5. Stamp the valid parent waypoints with the current timestamp
  updatedWaypointIds.forEach((wpId) => {
    if (faDataStore.waypoints[wpId]) {
      faDataStore.waypoints[wpId].lastUpdatedDetailsAt = now;
    }
  });
};
