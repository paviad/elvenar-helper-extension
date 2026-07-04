import { BuildingFinder } from '../city/buildingFinder';
import { BuildingEx } from '../model/buildingEx';
import { CityEntity } from '../model/cityEntity';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { KpHuntData, PackHuntData } from '../model/kpHuntData';
import { getAccountBySessionId } from './AccountManager';
import { AccountData } from './Accounts';
import { extractElvenarResponse } from './extractElvenarResponse';
import { decrementRetrievingCounter, getPlayerGuildName, getPlayerPageIndex } from './processRankingData';

let finder: BuildingFinder | null = null;
let myPlayerId: number | undefined = undefined;
let accountData: AccountData | undefined = undefined;

export interface HuntersInformation {
  contributionsRecorded: Record<string, boolean>;
  otherHunters: Record<string, number>;
  otherHuntersKpAmounts: Record<string, number>;
}

const huntersInformationByWorld: Record<string, HuntersInformation> = {};

export const processNeighborAncientWondersData = async (
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
): Promise<boolean | undefined> => {
  if (!finder) {
    finder = new BuildingFinder();
    await finder.ensureInitialized();
    accountData = getAccountBySessionId(sharedInfo.sessionId);
    myPlayerId = accountData?.cityQuery?.userData.player_id;
  }

  const ancientWonderResponses = extractElvenarResponse<AncientWonderResponse>(
    untypedResponseArray,
    'AncientWonderService',
    'getOtherPlayerAncientWonders',
  );

  const world = sharedInfo.worldId;
  const huntersInfo = huntersInformationByWorld[world] || {
    contributionsRecorded: {},
    otherHunters: {},
    otherHuntersKpAmounts: {},
  };
  huntersInformationByWorld[world] = huntersInfo;

  let rc = false;

  for (const resp of ancientWonderResponses) {
    const ancientWonderPhases = resp.ancientWonderPhases;

    const awDictionary = (resp.cityEntities || []).reduce(
      (dict, entity) => {
        dict[entity.base_name] = entity.id;
        return dict;
      },
      {} as Record<string, string>,
    );

    decrementRetrievingCounter(sharedInfo);

    if (!ancientWonderPhases) {
      continue;
    }

    const playerName = resp.playerInfo.name;
    const playerId = resp.playerInfo.player_id;
    const pageIndex = (getPlayerPageIndex(resp.playerInfo.player_id) || -1) + 1;
    const ownerGuild = getPlayerGuildName(resp.playerInfo.player_id) || resp.playerInfo.player_id.toString();

    if (resp.playerInfo.player_id === myPlayerId) continue;

    const researchPhases = ancientWonderPhases.filter((phase) => phase.__class__ === 'ResearchPhaseVO');

    for (const phase of researchPhases) {
      const iAlreadyContributed = phase.contributions?.find(
        (contribution) => contribution.player.player_id === myPlayerId,
      );
      if (iAlreadyContributed) {
        continue;
      }

      rc =
        rc ||
        calculatePhase(
          finder,
          phase,
          ownerGuild,
          playerName,
          huntersInfo,
          sharedInfo,
          pageIndex,
          playerId,
          awDictionary,
        );
    }
  }

  /*
  // Show other hunters sorted by entry value in descending order
  const sortedHunters = Object.entries(otherHunters)
    .sort((a, b) => b[1] - a[1]);
  console.log('E Other hunters (sorted):', sortedHunters);
  const top10Hunters = sortedHunters.slice(0, 10)
    .map(([name, count], idx) => `${idx + 1}. ${name}: ${count} KP: ${otherHuntersKpAmounts[name] || 0}`)
    .join('\n');
  console.log('E Top 10 hunters:\n' + top10Hunters);
  */

  return rc;
};

const extractLastNumber = (str: string): number => {
  const matches = str.match(/(\d+)$/);
  return matches ? parseInt(matches[1], 10) : 0;
};

export interface AncientWonderPhases {
  __class__: AncientWonderPhaseClass;
  playerId: number;
  entityBaseName: string;
  resourceId: string;
  runesMask?: number;
  insertionCost?: number;
  numRunes?: number;
  forgeResourceId?: string;
  numForgeResources?: number;
  investedKnowledgePoints?: number;
  requiredKnowledgePoints?: number;
  contributions?: Contribution[];
  receiverKpLimit?: number;
  isFavourite?: boolean;
}

export type AncientWonderPhaseClass = 'ResearchPhaseVO' | 'RunesPhaseVO';

export interface Contribution {
  __class__: ContributionClass;
  rank: number;
  player: Player;
  knowledgePoints?: number;
  reward?: ContributionReward;
}

export type ContributionClass = 'ResearchContributionVO';

export interface Player {
  player_id: number;
  name: string;
  avatar?: Avatar;
  guild_info?: GuildInfo;
}

export type Avatar = string;

export interface GuildInfo {
  id: number;
  name: string;
}

export enum GuildInfoClass {
  GuildInfoVO = 'GuildInfoVO',
}

export enum ShapeID {
  Guildbanner09 = 'guildbanner09',
}

export enum SymbolID {
  Guildicon10 = 'guildicon10',
}

export interface ContributionReward {
  icon: Icon;
  rewards: RewardElement[];
}

export type Icon = string;

export interface RewardElement {
  type: Type;
  subType: string;
  amount: number;
}

export type Type = 'good' | 'item';

interface AncientWonderResponse {
  ancientWonderPhases: AncientWonderPhases[];
  cityEntities: AwCityEntity[];
  playerInfo: {
    player_id: number;
    name: string;
  };
}

export interface AwCityEntity {
  id: string;
  base_name: string;
}

interface ProcessedContribution {
  index: number;
  rank: number;
  player_id: number;
  playerName: string;
  guildName: string;
  knowledgePoints: number;
  filteredRewards: number;
  numberOfRunes: number;
}

export const calculatePhase = (
  finder: BuildingFinder,
  phase: AncientWonderPhases,
  ownerGuild: string,
  playerName: string,
  huntersInfo: HuntersInformation,
  sharedInfo: ExtensionSharedInfo,
  pageIndex: number,
  playerId: number,
  awDictionary: Record<string, string>,
) => {
  const isFavorite = phase.isFavourite;
  const totalKpNeeded = phase.requiredKnowledgePoints || 0;
  const investedKp = phase.investedKnowledgePoints || 0;
  const remainingKp = totalKpNeeded - investedKp;
  const filteredContributions =
    phase.contributions
      ?.map(
        (contribution, index) =>
          ({
            index: 0,
            rank: contribution.rank,
            player_id: contribution.player.player_id,
            playerName: contribution.player.name,
            guildName: contribution.player.guild_info?.name || contribution.player.player_id.toString(),
            knowledgePoints: contribution.knowledgePoints || 0,
            filteredRewards:
              contribution.reward?.rewards
                .map((reward) => ({
                  combinedType: reward.type === 'good' ? 'good' : reward.subType,
                  amount:
                    reward.type === 'good' ? reward.amount * 15 : extractLastNumber(reward.subType) * reward.amount,
                }))
                .reduce((acc, curr) => acc + curr.amount, 0) || 0,
            numberOfRunes:
              contribution.reward?.rewards
                .map((reward) => (reward.type === 'good' ? reward.amount : 0))
                .reduce((acc, curr) => acc + curr, 0) || 0,
          }) satisfies ProcessedContribution,
      )
      .filter((r) => r.rank !== -1)
      .map((r, i) => ({ ...r, index: i }))
      .sort((a, b) => a.rank - b.rank) || [];

  const building = finder.getBuilding(phase.entityBaseName);

  for (const contribution of filteredContributions) {
    const isHunter = contribution.player_id > 0 && contribution.guildName !== ownerGuild;

    if (isHunter) {
      checkHunter(contribution, playerName, building, huntersInfo);
    }

    if (contribution.knowledgePoints >= contribution.filteredRewards) continue;
    if (contribution.knowledgePoints >= remainingKp) continue;

    // single hunter
    const contributeAtLeast = Math.ceil((remainingKp + contribution.knowledgePoints) / 2);

    // double hunters
    let packHunt: KpHuntData['packHunt'] | undefined = undefined;
    let maxPackProfit: PackHuntData | undefined = undefined;

    const startingContribution = Math.min(remainingKp, filteredContributions[0].filteredRewards - 1);

    for (let dblContributeAtLeast = startingContribution; dblContributeAtLeast > 0; dblContributeAtLeast--) {
      for (
        let nextContributeAtLeast = Math.min(remainingKp - dblContributeAtLeast, dblContributeAtLeast);
        nextContributeAtLeast > 0;
        nextContributeAtLeast--
      ) {
        const profit = calcProfit(remainingKp, filteredContributions, dblContributeAtLeast, nextContributeAtLeast);
        if (!profit) {
          continue;
        }
        const totalStandToGain = profit.firstStandToGain + profit.secondStandToGain;
        if (profit.firstStandToGain < 0 || profit.secondStandToGain < 0 || totalStandToGain <= 0) {
          continue;
        }
        const existingTotalStandToGain = maxPackProfit
          ? maxPackProfit.firstStandToGain + maxPackProfit.secondStandToGain
          : 0;
        if (totalStandToGain > existingTotalStandToGain) {
          maxPackProfit = profit;
        }
      }
    }

    if (maxPackProfit && maxPackProfit.firstStandToGain > 0 && maxPackProfit.secondStandToGain > 0) {
      const dblStandToGain = maxPackProfit.firstStandToGain;
      const nextStandToGain = maxPackProfit.secondStandToGain;
      const dblContributeAtLeast = maxPackProfit.firstContribution;
      const nextContributeAtLeast = maxPackProfit.secondContribution;
      packHunt = maxPackProfit;
    }

    if (contributeAtLeast >= contribution.filteredRewards && !packHunt) continue;

    const standToGain = Math.max(0, contribution.filteredRewards - contributeAtLeast);

    // we can steal it!
    accountData = getAccountBySessionId(sharedInfo.sessionId);
    if (accountData) {
      accountData.kpHuntOpportunities = accountData.kpHuntOpportunities || {};
      const kpHuntRecord: KpHuntData = {
        playerId,
        guildName: ownerGuild,
        buildingId: phase.entityBaseName,
        buildingFullId: awDictionary[phase.entityBaseName],
        resourceId: phase.resourceId,
        buildingName: building?.name || phase.entityBaseName,
        contributeAtLeast,
        standToGain,
        numberOfRunes: contribution.numberOfRunes,
        totalKpNeeded,
        investedKp,
        pageIndex: pageIndex || accountData.kpHuntOpportunities[playerName]?.pageIndex || 0,
        isFavorite,
        packHunt,
      };
      accountData.kpHuntOpportunities[playerName] = kpHuntRecord;
    }
    return true;
  }
  return false;
};

const checkHunter = (
  contribution: ProcessedContribution,
  playerName: string,
  building: BuildingEx | undefined,
  huntersInfo: HuntersInformation,
) => {
  const { contributionsRecorded, otherHunters, otherHuntersKpAmounts } = huntersInfo;
  const contributionId = `${playerName}-${building?.name}-${contribution.playerName}`;
  const contributionAmount = contribution.knowledgePoints;
  if (!contributionsRecorded[contributionId]) {
    otherHunters[contribution.playerName] = (otherHunters[contribution.playerName] || 0) + 1;
    otherHuntersKpAmounts[contribution.playerName] =
      (otherHuntersKpAmounts[contribution.playerName] || 0) + contributionAmount;
    contributionsRecorded[contributionId] = true;
  }
};

const calcProfit = (
  remainingKp: number,
  filteredContributions: ProcessedContribution[],
  dblContributeAtLeast: number,
  nextContributeAtLeast: number,
): PackHuntData | undefined => {
  const firstChestIndex = filteredContributions.findIndex((c) => c.knowledgePoints < dblContributeAtLeast);
  if (firstChestIndex === -1) {
    return undefined;
  }
  const firstChest = filteredContributions[firstChestIndex];
  const firstContenter = filteredContributions[firstChestIndex];
  const secondChestIndex = filteredContributions.findIndex((c) => c.knowledgePoints < nextContributeAtLeast);
  if (secondChestIndex === -1) {
    return undefined;
  }
  const secondChest = filteredContributions[secondChestIndex + 1];
  if (!secondChest) {
    return undefined;
  }
  const secondContender = filteredContributions[secondChestIndex];

  const firstStandToGain = firstChest.filteredRewards - dblContributeAtLeast;
  const nextStandToGain = secondChest.filteredRewards - nextContributeAtLeast;
  if (firstStandToGain <= 0 || nextStandToGain <= 0) {
    return undefined;
  }
  const remainingAfterContributions = remainingKp - dblContributeAtLeast - nextContributeAtLeast;
  const canFirstBeOvertaken =
    remainingAfterContributions + (firstContenter?.knowledgePoints || 0) > dblContributeAtLeast;
  const canSecondBeOvertaken =
    remainingAfterContributions + (secondContender?.knowledgePoints || 0) > nextContributeAtLeast;
  if (canFirstBeOvertaken || canSecondBeOvertaken) {
    return undefined;
  }
  return {
    firstContribution: dblContributeAtLeast,
    firstStandToGain,
    secondContribution: nextContributeAtLeast,
    secondStandToGain: nextStandToGain,
    firstRunes: firstChest.numberOfRunes,
    secondRunes: secondChest.numberOfRunes,
  };
};
