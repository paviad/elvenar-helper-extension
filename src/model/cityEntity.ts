export interface CityEntity {
  __class__: string;
  cityentity_id: string;
  id: number;
  level: number;
  player_id: number;
  state: State;
  type: string;
  x: number;
  y: number;
  connected: boolean;
  setConnections: SetConnections;

  length?: number;
  width?: number;
  description?: string;
  name?: string;
}

export interface SetConnections {
  __class__: string;
}

export interface State {
  __class__: string;
  next_state_transition_in: number;
  current_product: CurrentProduct;
  resources: RequiredResourcesClass;
}

export interface CurrentProduct {
  __class__: string;
  production_time: number;
  production_option: number;
  productionAmount: number;
  revenue: Revenue;
  requiredResources: RequiredResourcesClass;
  originalProductionTime: number;
  originalRevenue: Revenue;
}

export interface Revenue {
  __class__: string;
  resources: OriginalRevenueResources;
}

export interface OriginalRevenueResources {
  __class__: string;
  seeds: number;
}

export interface RequiredResourcesClass {
  __class__: string;
  resources: SetConnections;
}
