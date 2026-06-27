import { Badges, Relics } from '../model/badges';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export const processCityResourcesUpdate = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => {
  const responseJson = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: unknown;
  }[];

  const json = responseJson.find(
    (entry) => entry.requestClass === 'CityResourcesService' && entry.requestMethod === 'getResources',
  );

  const cityResources = json?.responseData as
    | {
      resources: Record<string, number>;
    }
    | undefined;

  const { __class__, ...resources } = cityResources?.resources || {};

  const badges: Badges = {
    badge_brewery: resources.badge_brewery,
    badge_carpenters: resources.badge_carpenters,
    badge_farmers: resources.badge_farmers,
    badge_blacksmith: resources.badge_blacksmith,
    golden_bracelet: resources.golden_bracelet,
    diamond_necklace: resources.diamond_necklace,
    elegant_statue: resources.elegant_statue,
    witch_hat: resources.witch_hat,
    druid_staff: resources.druid_staff,
    badge_wonderhelper: resources.badge_wonderhelper,
    badge_unit: resources.badge_unit,
    money_sack: resources.money_sack,
    arcane_residue: resources.arcane_residue,
    recycled_potion: resources.recycled_potion,
    enchanted_tiara: resources.enchanted_tiara,
    ghost_in_a_bottle: resources.ghost_in_a_bottle,
  };

  const relics: Relics = {
    relic_crystal: resources.relic_crystal,
    relic_elixir: resources.relic_elixir,
    relic_gems: resources.relic_gems,
    relic_magic_dust: resources.relic_magic_dust,
    relic_marble: resources.relic_marble,
    relic_planks: resources.relic_planks,
    relic_scrolls: resources.relic_scrolls,
    relic_silk: resources.relic_silk,
    relic_steel: resources.relic_steel,
  };

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData?.cityQuery) {
    accountData.cityQuery.cityResources = resources;
  }
};
