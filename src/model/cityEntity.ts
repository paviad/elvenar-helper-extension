export interface CityEntity {
  cityentity_id: string;
  id: number;
  level: number;
  stage?: number;
  player_id: number;
  state?: State;
  type: string;
  x: number;
  y: number;
  connected: boolean;
  setConnections?: SetConnections;
  connectionStrategy: string;
  /**
   * Not from the wire: when the game last reported this entity's state, stamped by
   * `processCityMapServiceUpdate`. `next_state_transition_in` counts from here. Absent on an
   * entity that has not been reported since the city loaded, where `cityQuery.timestamp` is it.
   */
  stateAt?: number;
}

export interface CityEntityExData {
  length: number;
  width: number;
  description: string;
  name: string;
  connectionStrategy: string;
  expiration?: number;
  chapter?: number;
  expirationEnd?: number;
}

export type CityEntityEx = CityEntity & CityEntityExData;

export interface SetConnections {
  __class__: string;
}

export interface State {
  /** The game's own name for the state: IdleVO, ProducingVO, UpgradingVO, and so on. */
  __class__?: string;
  /**
   * Seconds until the state turns over, counted from when the state was reported
   * (`CityEntity.stateAt`). Only the states that are waiting for something carry one - an
   * `IdleVO` is reported as nothing but its `__class__`.
   */
  next_state_transition_in?: number;
  current_product?: CurrentProduct;
  resources?: RequiredResourcesClass;
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
  resources: Record<string, number>;
}

export interface RequiredResourcesClass {
  resources: SetConnections;
}
