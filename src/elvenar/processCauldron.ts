import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Ingredient } from '../model/ingredient';
import { PotionEffect } from '../model/potionEffect';
import { getAccountBySessionId } from './AccountManager';

export async function processCauldron(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [unknown, { responseData: Ingredient[] }, { responseData: PotionEffect[] }];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.cauldron = {
      ingredients: json[1].responseData,
      potionEffects: json[2].responseData,
    };
  }
}
