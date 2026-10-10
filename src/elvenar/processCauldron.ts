import { premiumIngredientIndexes } from '../cauldron/cauldronSync';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Ingredient } from '../model/ingredient';
import { getAccountBySessionId } from './accountStore';

/**
 * The game asks for the cauldron's ingredients at startup. During the brewing cooldown the answer
 * is empty, so an empty one leaves what is stored alone rather than forgetting this week's set.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function processCauldron(responses: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) {
  const entry = responses.find((r) => r.requestClass === 'CauldronService' && r.requestMethod === 'getIngredients');
  const ingredients = (entry?.responseData as Ingredient[] | undefined) ?? [];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (accountData && ingredients.length > 0) {
    accountData.cauldron = {
      premiumIngredients: premiumIngredientIndexes(ingredients),
      sessionId: sharedInfo.sessionId,
    };
  }
}
