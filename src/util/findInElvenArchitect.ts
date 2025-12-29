import { ElvenarchitectEntry } from '../model/elvenarchitectEntry';
import { normalizeString } from './normalizeString';

const elvenarchitectDataUrl = chrome.runtime.getURL('elvenarchitect_data.json');
let elvenarchitectData: ElvenarchitectEntry[];

let elvenarchitectDictionary: Record<string, string>;

export async function initElvenarchitectData() {
  elvenarchitectData = await (await fetch(elvenarchitectDataUrl, { method: 'GET' })).json();
  elvenarchitectDictionary = elvenarchitectData.reduce((acc, entry) => {
    acc[normalizeString(entry.link)] = entry.name;
    return acc;
  }, {} as Record<string, string>);
}

export function findInElvenarchitect(cityentity_id1: string): string | undefined {
  const cityentity_id = normalizeString(cityentity_id1);
  const stripLevel = cityentity_id.replace(/_\d+$/i, '');

  if (elvenarchitectDictionary[cityentity_id]) {
    return elvenarchitectDictionary[cityentity_id];
  }

  if (elvenarchitectDictionary[stripLevel]) {
    return elvenarchitectDictionary[stripLevel];
  }

  return undefined;
}
