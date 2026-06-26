export interface FAOverviewStage {
  __class__:     string;
  requestClass:  string;
  requestMethod: string;
  requestId:     number;
  responseData:  FAOverviewData;
}

export interface FAOverviewData {
  __class__:      string;
  difficulty:     number;
  state:          string;
  guildEventRank: number;
  selectedPath:   string;
  stageRewards:   StageReward[];
}

export interface StageReward {
  __class__: string;
  rewards?:  Reward[];
}

export interface Reward {
  __class__: Class;
  type:      string;
  subType:   string;
  amount:    number;
}

export enum Class {
  RewardVO = "RewardVO",
}
