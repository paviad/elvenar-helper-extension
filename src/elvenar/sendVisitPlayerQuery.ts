import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { OtherPlayerClass } from '../model/otherPlayer';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { AccountData, setAccountData } from './AccountManager';

export async function sendVisitPlayerQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer, reqBodyVisitPlayer: reqBody, worldId } = sharedInfo;

  const response = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
      'content-type': 'application/json',
      'os-type': 'browser',
      priority: 'u=1, i',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'ElvenarHaxeClient',
    },
    referrer,
    body: reqBody,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(
      'Your game session has expired since last time you used this tool. Please refresh the game tab and then refresh this tab.',
    );
  }

  const json = (await response.json()) as [{ requestClass: string; responseData: unknown }];

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
    '1': 'Arendyll',
    '2': 'Wyniandor',
    '3': 'Felyndral',
  };
  const accountId = 'Visited';
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
    guild_info: {
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
    },
    sharedInfo,
    isDetached: true,
  } satisfies AccountData;

  await setAccountData(accountId, data);
}
