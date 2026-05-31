import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export const processQuestMilestoneUpdate = async (
  json: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<number | undefined> => {
  const milestoneUpdate = json.find(
    (r) => r.requestClass === 'QuestMilestoneService' && r.requestMethod === 'updateQuestMilestone',
  )?.responseData as
    | {
        progress: number;
      }
    | undefined;

  return milestoneUpdate?.progress;
};
