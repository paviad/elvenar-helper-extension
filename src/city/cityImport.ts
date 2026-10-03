import { UnlockedArea } from '../model/unlockedArea';
import { GridMax, PaddingTiles } from './gridConstants';

/** A building as an import string lists it, checked to be one the editor can place. */
export interface ImportedEntity {
  id: number;
  cityentity_id: string;
  x: number;
  y: number;
  level?: number;
  stage?: number;
  type?: string;
}

export interface CityImport {
  entities: ImportedEntity[];
  unlockedAreas: UnlockedArea[];
  race: string;
  /** Absent from exports made before it was written, and from other tools' strings. */
  chapter?: number;
}

/** Why an import string was turned down, worded for the player who pasted it. */
export class CityImportError extends Error {}

/**
 * The export string: the JSON's UTF-8 bytes in base64. `btoa` alone takes only Latin-1, and the
 * export carries names from the game's own translations - Polish, Russian, Greek and so on.
 */
export function encodeCityExport(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * The JSON an export string holds. Strings made before the export went UTF-8 were the JSON's
 * Latin-1 characters in base64; any of those that is not also valid UTF-8 is read that old way.
 */
export function decodeCityExport(text: string): string {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return binary;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The game leaves out a coordinate that is zero, so an absent one reads as 0. */
const coordinate = (value: unknown): number | undefined =>
  value === undefined ? 0 : Number.isInteger(value) ? (value as number) : undefined;

const positiveInteger = (value: unknown): number | undefined =>
  Number.isInteger(value) && (value as number) > 0 ? (value as number) : undefined;

const nonNegativeInteger = (value: unknown): number | undefined =>
  Number.isInteger(value) && (value as number) >= 0 ? (value as number) : undefined;

function readArea(value: unknown): UnlockedArea {
  if (!isRecord(value)) {
    throw new CityImportError('One of the unlocked areas in this city is not an area.');
  }
  const x = coordinate(value.x);
  const y = coordinate(value.y);
  const width = positiveInteger(value.width);
  const length = positiveInteger(value.length);
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    length === undefined ||
    x < 0 ||
    y < 0 ||
    x + width > GridMax ||
    y + length > GridMax
  ) {
    throw new CityImportError('One of the unlocked areas in this city lies outside the city grid.');
  }
  return { x, y, width, length };
}

function readEntity(value: unknown): Omit<ImportedEntity, 'id'> & { id: unknown } {
  if (!isRecord(value) || typeof value.cityentity_id !== 'string' || value.cityentity_id === '') {
    throw new CityImportError('One of the buildings in this city has no building id.');
  }
  const x = coordinate(value.x);
  const y = coordinate(value.y);
  // Buildings parked off the grid are exported where they stand, in the margin around it.
  const inReach = (n: number | undefined) => n !== undefined && n >= -PaddingTiles && n < GridMax + PaddingTiles;
  if (!inReach(x) || !inReach(y)) {
    throw new CityImportError(`${value.cityentity_id} is placed outside the city grid.`);
  }
  return {
    id: value.id,
    cityentity_id: value.cityentity_id,
    x: x!,
    y: y!,
    level: positiveInteger(value.level),
    stage: nonNegativeInteger(value.stage),
    type: typeof value.type === 'string' ? value.type : undefined,
  };
}

/**
 * Reads an import string into a city the editor can save, or throws a CityImportError saying what
 * is wrong with it. The string may come from anywhere - an older version of this extension,
 * another tool, a hand edit - so nothing in it is taken on trust: a city saved with a missing list
 * or a stray coordinate would otherwise break the editor every time it was opened.
 */
export function parseCityImport(text: string): CityImport {
  let data: unknown;
  try {
    data = JSON.parse(decodeCityExport(text));
  } catch {
    throw new CityImportError('This is not an exported city.');
  }

  if (!isRecord(data) || !isRecord(data.city_map)) {
    throw new CityImportError('This is not an exported city.');
  }
  const { entities, unlocked_areas } = data.city_map;
  if (!Array.isArray(entities)) {
    throw new CityImportError('The exported city has no list of buildings.');
  }
  if (!Array.isArray(unlocked_areas)) {
    throw new CityImportError('The exported city has no list of unlocked areas.');
  }
  const userData = isRecord(data.user_data) ? data.user_data : {};
  if (typeof userData.race !== 'string' || userData.race === '') {
    throw new CityImportError('The exported city does not say which race it is.');
  }

  // Blocks are keyed by id, so two buildings sharing one would leave only one of them standing.
  const read = entities.map(readEntity);
  const taken = new Set<number>();
  let nextId = Math.max(0, ...read.map((e) => (Number.isInteger(e.id) ? (e.id as number) : 0))) + 1;
  const withIds = read.map((entity) => {
    const id = Number.isInteger(entity.id) && !taken.has(entity.id as number) ? (entity.id as number) : nextId++;
    taken.add(id);
    return { ...entity, id };
  });

  return {
    entities: withIds,
    unlockedAreas: unlocked_areas.map(readArea),
    race: userData.race,
    chapter: positiveInteger(userData.chapter),
  };
}
