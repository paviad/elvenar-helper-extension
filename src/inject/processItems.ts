import { ItemDefinition } from '../model/itemDefinition';

export const processItems = (decodedResponse: string) => {
  const items = JSON.parse(decodedResponse) as ItemDefinition[];

  return { items };
};
