export interface PackHuntData {
  firstContribution: number;
  firstStandToGain: number;
  secondContribution: number;
  secondStandToGain: number;
  firstRunes: number;
  secondRunes: number;
}

export interface KpHuntData {
  buildingId: string;
  resourceId: string;
  buildingName: string;
  contributeAtLeast: number;
  standToGain: number;
  totalKpNeeded: number;
  investedKp: number;
  pageIndex: number;
  numberOfRunes: number;
  isFavorite?: boolean;

  packHunt?: PackHuntData;
}
