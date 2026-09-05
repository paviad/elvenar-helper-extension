import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { WorldNeighbor } from '../model/worldNeighbors';
import { MessageOf, MessageResponse } from './messages';

declare module './messages' {
  interface RuntimeMessages {
    /**
     * Sent by the overlay whenever Auto on the KP hunt is set, and once on load. Off, the worker
     * ignores ranking pages and drops the tab's outstanding count.
     */
    setKpHuntAuto: { on: boolean };
    /** Sent by the overlay to drop one KP Hunt opportunity, or all of them when none is named. */
    clearKpHuntOpportunities: { accountId: string; opportunityId?: string };
    spirePicks: {
      picks: string[];
      /** Latest win probability from the Spire Wizard; absent on a fresh encounter. */
      prob?: string;
      /** 1-based ghost to spend a joker on; absent when a joker is not an option. */
      jokerGhost?: number;
      /** Round these values apply to. Optional: a wizard tab running a pre-update inject omits it. */
      turn?: number;
      /** Badge-only progress signal. When set there are no picks and nothing is relayed to the page. */
      status?: 'waiting' | 'timeout';
    };
  }

  interface MessageResponses {
    clearKpHuntOpportunities: MessageResponse;
  }

  interface TabMessages {
    retrievingCounterUpdate: {
      retrievingCounter: number;
      /** Set when the count was dropped because the hunt stopped, rather than counted down. */
      abandoned?: boolean;
    };
    kpHuntOpportunity: Record<never, never>;
    initialWorldMapData: { initialWorldMapData: InitialWorldMapData };
    worldNeighborsUpdated: { worldNeighbors: WorldNeighbor[] };
    neighbourHelpData: { neighbourHelpData: NeighbourHelpData };
    helpPerformedUpdateProvince: { updatedProvince: WorldNeighbor };
  }
}

export type SpirePicksMessage = MessageOf<'spirePicks'>;
