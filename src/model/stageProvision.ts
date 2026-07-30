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
 * What one of a building's catalog product slots yields at a given stage.
 *
 * `index` addresses the slot and defaults to 0. `factor` multiplies that slot's catalog
 * revenue; an entry with no `factor` marks a slot that has not unlocked at this stage.
 * `value` (optionally naming a `goodId`) replaces the slot with a flat item reward -
 * knowledge points, spell fragments, relics, goods - and never appears alongside `factor`.
 * A slot the stage does not mention keeps its catalog value.
 */
export interface StageProduct {
  index?: number;
  factor?: number;
  goodId?: string;
  value?: number;
}
