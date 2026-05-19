import { saveToStorage } from '../chrome/storage';
import { ArmyDetails } from '../model/armyDetails';
import { Badges, Relics } from '../model/badges';
import { BoostedGoods } from '../model/boostedGoods';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Quest } from '../model/quest';
import { SeasonalEvent } from '../model/seasonalEvent';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { generateAccountId, getAccountBySessionId, setAccountData } from './AccountManager';
import { FaQuest } from './Accounts';
import { AccountData } from './Accounts';

export async function processCityData(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [{ requestClass: string; requestMethod: string; responseData: unknown }];

  const startupService = json.find((r) => r.requestClass === 'StartupService')?.responseData as {
    user_data: ElvenarUserData;
    featureFlags: { feature: string }[];
    city_map: { entities: CityEntity[]; unlocked_areas: UnlockedArea[] };
    relic_boost_good: BoostedGoods[];
    resources: { resources: Badges & Relics };
    production_boost: { boost: number; relics_needed: number }[];
    effects: {
      actionId: string;
      ownerId: string;
      type: string;
      owner: string;
      remainingTime: number;
    }[];
    seasonal_events?: SeasonalEvent[];
    army_details?: ArmyDetails;
  } | undefined;

  const cityResourcesService = json.find(
    (r) => r.requestClass === 'CityResourcesService' && r.requestMethod === 'getResources',
  )?.responseData as {
    resources: Record<string, number>;
  } | undefined;

  const { __class__, ...cityResources } = cityResourcesService?.resources || {};

  const questService = json.find((r) => r.requestClass === 'QuestService')?.responseData as Quest[] | undefined;

  const faRequirements = questService ? Object.fromEntries(
    questService
      .filter((r) => r.rewards?.length > 0 && r.successConditions?.length > 0)
      .map((r, idx) => [
        r.rewards[0].iconType,
        {
          id: idx,
          badge: r.rewards[0].iconType,
          maxProgress: r.successConditions[0].maxProgress,
          currentProgress: r.successConditions[0].totalProgress || 0,
        } satisfies FaQuest,
      ]),
  ) : {};

  const effectsService = json.find((r) => r.requestClass === 'EffectsService' && r.requestMethod === 'getAllSources')
    ?.responseData as {
      name: string;
      value: number;
    }[] | undefined;

  const squadSize = effectsService?.find((r) => r.name === 'squadSize')?.value || 0;

  const rankingService = json.find((r) => r.requestClass === 'RankingService' && r.requestMethod === 'newRank')
    ?.responseData as {
      rank: number;
      points: number;
    } | undefined;

  const rankingPoints = rankingService?.points || 0;

  if (!startupService) {
    console.warn('ElvenAssist: No StartupService data found in the provided JSON.');
    return;
  }

  const { user_data, featureFlags, city_map, relic_boost_good, resources } = startupService;

  const maxChapter = Number(
    featureFlags?.find((r) => r.feature.startsWith('ch'))?.feature.replace('ch', ''),
  );

  const boostedGoods = relic_boost_good?.map((bg) => `${bg.good_type === 'common' ? '' : bg.good_type}${bg.good_id}`) || [];

  const chapter = user_data.technologySection.index;

  const cityEntities = city_map.entities;
  const unlockedAreas = city_map.unlocked_areas;
  const badges: Badges = {
    badge_brewery: resources.resources.badge_brewery,
    badge_carpenters: resources.resources.badge_carpenters,
    badge_farmers: resources.resources.badge_farmers,
    badge_blacksmith: resources.resources.badge_blacksmith,
    golden_bracelet: resources.resources.golden_bracelet,
    diamond_necklace: resources.resources.diamond_necklace,
    elegant_statue: resources.resources.elegant_statue,
    witch_hat: resources.resources.witch_hat,
    druid_staff: resources.resources.druid_staff,
    badge_wonderhelper: resources.resources.badge_wonderhelper,
    badge_unit: resources.resources.badge_unit,
    money_sack: resources.resources.money_sack,
    arcane_residue: resources.resources.arcane_residue,
    recycled_potion: resources.resources.recycled_potion,
    enchanted_tiara: resources.resources.enchanted_tiara,
    ghost_in_a_bottle: resources.resources.ghost_in_a_bottle,
  };
  const relics: Relics = {
    relic_crystal: resources.resources.relic_crystal,
    relic_elixir: resources.resources.relic_elixir,
    relic_gems: resources.resources.relic_gems,
    relic_magic_dust: resources.resources.relic_magic_dust,
    relic_marble: resources.resources.relic_marble,
    relic_planks: resources.resources.relic_planks,
    relic_scrolls: resources.resources.relic_scrolls,
    relic_silk: resources.resources.relic_silk,
    relic_steel: resources.resources.relic_steel,
  };
  const boostsTable = startupService.production_boost
    .map((r) => [r.relics_needed || 0, r.boost])
    .sort((a, b) => b[0] - a[0]);
  const relicBoosts = Object.fromEntries(
    Object.entries(relics).map(
      ([k, v]: [string, number]) => [k as keyof Relics, boostsTable.find(([req]) => v >= req)?.[1] || 0] as const,
    ),
  ) as Record<keyof Relics, number>;

  const seasonPass = startupService.seasonal_events?.find((r) => r.type === 'seasonPass') as {
    type: string;
  };

  const tournaments = startupService.seasonal_events?.filter((r) => r.type === 'tournament') || [];

  const worldNames: Record<string, string> = {
    '1': 'Arendyll',
    '2': 'Wyniandor',
    '3': 'Felyndral',
  };
  const worldId = sharedInfo.worldId;
  const accountId = generateAccountId(user_data.player_id, worldId);
  const worldName = worldId === 'zz' ? 'Beta' : worldNames[worldId[worldId.length - 1]] || '';
  const worldIdAndName = `${worldId} ${worldName}`.trim();
  const accountName = `${user_data.user_name} (${worldIdAndName})`.trim();

  const accountData = getAccountBySessionId(sharedInfo.sessionId) || {};

  const data = {
    ...accountData,
    cityQuery: {
      maxChapter,
      boostedGoods,
      chapter,
      cityEntities,
      unlockedAreas,
      userData: user_data,
      accountId,
      accountName,
      cityName: user_data.city_name,
      url: sharedInfo.reqUrl,
      tabId: sharedInfo.tabId,
      sessionId: sharedInfo.sessionId,
      badges,
      relics,
      timestamp: Date.now(),
      faRequirements,
      relicBoosts,
      squadSize,
      rankingPoints,
      cityResources,
      armyDetails: startupService.army_details,
      tournaments,
    },
    sharedInfo,
    isDetached: false,
  } satisfies AccountData;

  setAccountData(accountId, data);
  await setMaxChapter(maxChapter);
}

async function setMaxChapter(maxChapter: number) {
  await saveToStorage('maxChapter', maxChapter.toString());
}
