export interface PackHuntData {
  firstContribution: number;
  firstStandToGain: number;
  secondContribution: number;
  secondStandToGain: number;
  firstRunes: number;
  secondRunes: number;
}

export interface KpHuntData {
  playerName: string;
  playerId: number;
  guildName: string;
  buildingId: string;
  buildingFullId: string;
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

/** One hunter can take it alone; otherwise it is there only because a pair could. */
export const worksAlone = (opportunity: KpHuntData): boolean => opportunity.standToGain > 0;

/** The opportunities to show, with the pair ones taken out when pairs are switched off. */
export const withPairsOrNot = <T extends KpHuntData>(opportunities: T[], includePairs: boolean): T[] =>
  includePairs
    ? opportunities
    : opportunities.filter(worksAlone).map((opportunity) => ({ ...opportunity, packHunt: undefined }));
