export interface ProductionBadgeInfo {
  id: number;
  name: string;
  asset_name: string;
  /** When the production finishes, in epoch milliseconds. */
  finishesAt: number;
  productionAmount: number;
}
