import { Tome } from '../model/tome';

export const processTomes = (responseText: string) => {
  const tomes = JSON.parse(responseText) as Tome[];

  return { tomes };
};
