export interface CityEntity {
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
  connectionStrategy: string;
}

export interface CityEntityExData {
  length: number;
  width: number;
  description: string;
  name: string;
  connectionStrategy: string;
}

export type CityEntityEx = CityEntity & CityEntityExData;

export interface SetConnections {
  __class__: string;
}

export interface State {
  next_state_transition_in: number;
  current_product: CurrentProduct;
  resources: RequiredResourcesClass;
}

export interface CurrentProduct {
  name?: string;
  asset_name?: string;

  production_time: number;
  production_option: number;
  productionAmount: number;
  revenue: Revenue;
  requiredResources: RequiredResourcesClass;
  originalProductionTime: number;
  originalRevenue: Revenue;
}

export interface Revenue {
  resources: OriginalRevenueResources;
}

export interface OriginalRevenueResources {
  seeds: number;
}

export interface RequiredResourcesClass {
  resources: SetConnections;
}
