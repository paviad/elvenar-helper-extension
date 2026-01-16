import { ItemDefinition } from '../model/itemDefinition';

export const processItems = (decodedResponse: string) => {
  const items = JSON.parse(decodedResponse) as ItemDefinition[];

  console.log('Processed Item Definitions:', items);

  return { items };
};
