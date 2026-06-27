import { Badges, badgeTypes } from '../model/badges';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Quest, Reward } from '../model/quest';
import { getAccountById, getAccountIdBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export const processQuestAdvance = async (response: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => {
  const accountId = getAccountIdBySessionId(sharedInfo.sessionId);
  if (!accountId) {
    console.warn('ElvenAssist: Account data not found for the given session ID.');
    return;
  }
  const accountData = getAccountById(accountId);
  if (!accountData) {
    console.warn('ElvenAssist: Account data not found for the given session ID.');
    return;
  }

  const rewards = response.find(
    (entry) => entry.requestClass === 'QuestService' && entry.requestMethod === 'advanceQuest',
  ) as { responseData: Reward[] } | undefined;

  const badges = accountData.cityQuery?.badges || ({} as Badges);

  if (rewards && Array.isArray(rewards.responseData)) {
    for (const reward of rewards.responseData) {
      if (reward.type === 'good' && badgeTypes.includes(reward.subType as keyof Badges)) {
        const badgeType = reward.subType as keyof Badges;
        badges[badgeType] = (badges[badgeType] || 0) + reward.amount;
      }
    }
  }

  if (accountData.cityQuery) {
    accountData.cityQuery.badges = badges; // Update the account data with the modified badges
  }
};
