import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { TranscendenceResponse } from '../model/transcendence';
import { getAccountBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export const processTranscendenceService = async (untypedJson: unknown, sharedInfo: ExtensionSharedInfo): Promise<void> => {
  console.log('Processing transcendence service response:', untypedJson);

  const response = untypedJson as ElvenarRequestResponseEntry[];

  const transcendenceServiceResponse = response.find(
    (entry) => entry.requestClass === 'TranscendenceService' && entry.requestMethod === 'allBuildingsStates',
  ) as TranscendenceResponse | undefined;

  const transcendenceData = transcendenceServiceResponse?.responseData.map((raw) => ({
    ...raw,
    endTime: Date.now() + raw.remainingTime * 1000, // assuming remainingTime is in seconds
  }));

  console.log('Processed transcendence data:', transcendenceData);

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.transcendenceData = transcendenceData;
  }
};
