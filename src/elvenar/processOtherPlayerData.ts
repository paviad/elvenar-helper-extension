import { guessRankingPointsFromChapter } from '../util/guessRankingPointsFromChapter';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { OtherPlayerClass } from '../model/otherPlayer';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { AccountData, setAccountData } from './AccountManager';

export async function processOtherPlayerData(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [{ requestClass: string; responseData: unknown }];

  const startupService = json.find((r) => r.requestClass === 'OtherPlayerService')?.responseData as {
    other_player: OtherPlayerClass;
    city_map: { entities: CityEntity[]; unlocked_areas: UnlockedArea[] };
    city_name: string;
    technologySection: number;
  };

  const { other_player, city_map, technologySection } = startupService;

  const chapter = technologySection;

  const cityEntities = city_map.entities;
  const unlockedAreas = city_map.unlocked_areas;

  const worldNames: Record<string, string> = {
    1: 'Arendyll',
    2: 'Wyniandor',
    3: 'Felyndral',
  };
  const accountId = 'Visited';
  const worldId = sharedInfo.worldId;
  const url = sharedInfo.reqUrl;
  const worldName = worldId === 'zz' ? 'Beta' : worldNames[worldId[worldId.length - 1]] || 'Unknown World';
  const compositeCityName = `${other_player.city_name}`;
  const accountName = `Temporary ${other_player.name} (${worldId} ${worldName})`;

  const userData = {
    ...other_player,
    user_name: other_player.name,
    portrait_id: other_player.avatar,
    technologySection: {
      index: technologySection,
      guestRace: '',
      description: '',
      fontColor: 0,
    },
    playerType: { value: '' },
    guild_info: other_player.guild_info && {
      id: other_player.guild_info.id,
      name: '',
      banner: {
        shapeId: '',
        shapeColor: 0,
        symbolId: '',
        symbolColor: 0,
      },
    },
  } satisfies ElvenarUserData;

  const squadSize = guessSquadSizeFromChapter(chapter);
  const rankingPoints = guessRankingPointsFromChapter(chapter);

  const data = {
    cityQuery: {
      maxChapter: chapter,
      boostedGoods: [],
      chapter,
      cityEntities,
      unlockedAreas,
      userData,
      accountId,
      accountName,
      cityName: compositeCityName,
      url,
      tabId: sharedInfo.tabId,
      sessionId: sharedInfo.sessionId,
      badges: {
        badge_brewery: 0,
        badge_carpenters: 0,
        badge_farmers: 0,
        badge_blacksmith: 0,
        golden_bracelet: 0,
        diamond_necklace: 0,
        elegant_statue: 0,
        witch_hat: 0,
        druid_staff: 0,
        badge_wonderhelper: 0,
        badge_unit: 0,
        money_sack: 0,
        arcane_residue: 0,
        recycled_potion: 0,
        enchanted_tiara: 0,
        ghost_in_a_bottle: 0,
      },
      relics: {
        relic_crystal: 0,
        relic_elixir: 0,
        relic_gems: 0,
        relic_magic_dust: 0,
        relic_marble: 0,
        relic_planks: 0,
        relic_scrolls: 0,
        relic_silk: 0,
        relic_steel: 0,
      },
      timestamp: Date.now(),
      faRequirements: {},
      relicBoosts: {
        relic_crystal: 0,
        relic_elixir: 0,
        relic_gems: 0,
        relic_magic_dust: 0,
        relic_marble: 0,
        relic_planks: 0,
        relic_scrolls: 0,
        relic_silk: 0,
        relic_steel: 0,
      },
      squadSize,
      rankingPoints,
    },
    sharedInfo,
    isDetached: true,
  } satisfies AccountData;

  await setAccountData(accountId, data);
}

const maxUpgradeIndexByChapter = [
  0, 3, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 71, 75, 79, 83, 87, 91,
];

const squadSizeIncrementByUpgrade = [
  6, 3, 6, 9,
  // Chapter 2
  12, 15, 18,
  // Chapter 3
  21, 24, 27,
  // Chapter 4
  30, 33, 36,
  // Chapter 5
  39, 42, 45,
  // Chapter 6
  48, 51, 54, 57,
  // Chapter 7
  60, 63, 66, 69,
  // Chapter 8
  72, 75, 78, 81,
  // Chapter 9
  84, 87, 90, 93,
  // Chapter 10
  96, 99, 102, 105,
  // Chapter 11
  108, 111, 114, 117,
  // Chapter 12
  120, 123, 126, 129,
  // Chapter 13
  132, 135, 138, 141,
  // Chapter 14
  144, 147, 150, 153,
  // Chapter 15
  156, 159, 162, 165,
  // Chapter 16
  168, 171, 174, 177,
  // Chapter 17
  180, 183, 186, 189,
  // Chapter 18
  192, 195, 198, 201,
  // Chapter 19
  204, 207, 210, 213,
  // Chapter 20
  216, 219, 222, 225,
  // Chapter 21
  505, 505, 534, 600,
  // Chapter 22
  600, 700, 700, 700,
  // Chapter 23
  800, 800, 800, 900,
  // Chapter 24
  1000, 1000, 1000, 1300,
];

function guessSquadSizeFromChapter(chapter: number): number {
  const maxUpgradeIndex = maxUpgradeIndexByChapter[chapter] || 1000;
  let squadSize = 0;

  // guessing final tech wasn't researched, so taking all but final increment.
  for (let i = 0; i <= maxUpgradeIndex - 1; i++) {
    squadSize += squadSizeIncrementByUpgrade[i] || 0;
  }
  return squadSize;
}
