import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export interface PlayerSpecificMessage {
  type: string;
  specific: true;
  payload: {
    request: ElvenarRequestResponseEntry;
    response: ElvenarRequestResponseEntry[];
    sharedInfo: ExtensionSharedInfo;
  };
}
