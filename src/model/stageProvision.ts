export interface StageProvision {
  baseName: string;
  /** Inventory item id of the artifact that evolves this building (e.g. INS_EVO_AUTUMN_XIX). */
  artifactId?: string;
  /** Artifacts consumed per evolution step. */
  artifactCost?: number;
  stages: Stage[];
}
export interface Stage {
  id: number;
  culture?: number;
  population?: number;
  products?: StageProduct[];
}
/**
 * Per-stage production scaling: `factor` multiplies the revenue of the building's base
 * product at `index`. Entries that instead carry goodId/value have unknown semantics,
 * and consumers must treat the stage data as unusable.
 */
export interface StageProduct {
  index?: number;
  factor?: number;
  goodId?: string;
  value?: number;
}
