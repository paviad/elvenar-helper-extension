/** One node of the research tree as the player stands in it, from `ResearchService/startup`. */
export interface TechnologyProgressResponse {
  __class__: 'TechnologyVO';
  id: string;
  /** Which good a boost technology was pointed at, on the few technologies that ask. */
  boosted_good?: string;
  progress: ResearchTechnologyProgress;
}

export interface ResearchTechnologyProgress {
  __class__: 'ResearchTechnologyProgressVO';
  tech_id: string;
  /** Knowledge points put into the technology so far. */
  currentSP?: number;
  gate_unlocked?: boolean;
  is_paid?: boolean;
}

/**
 * Where the city stands in the research tree, thinned to the three states a technology can be in.
 * Nothing past the chapter the city is in is kept — the tree runs well ahead of any player.
 */
export interface ResearchStatus {
  /** The chapter the city is in. Technologies of later chapters are left out entirely. */
  chapter: number;
  /** Ids of technologies that are paid for, in tree order. */
  researched: string[];
  /** Technologies whose predecessors are all researched, so knowledge can go into them now. */
  available: AvailableTechnology[];
  /** Ids of technologies of this chapter or earlier that are still waiting on a predecessor. */
  locked: string[];
}

export interface AvailableTechnology {
  id: string;
  /** Knowledge points still needed, i.e. the cost less whatever is already in it. */
  missingKp: number;
}
