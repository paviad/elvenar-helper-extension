import { CityBlock } from './CityBlock';

/** Shortest input treated as a regex, i.e. the two slashes plus one character. */
const MIN_REGEX_LENGTH = 3;

export type SearchMatcher = (value: string) => boolean;

/**
 * Builds a matcher for the city search box. A term wrapped in slashes is a
 * case-insensitive regular expression; anything else is a substring match.
 *
 * Returns null when nothing should match: an empty term, or a regex that does
 * not compile.
 */
export function createSearchMatcher(term: string): SearchMatcher | null {
  if (!term) return null;

  if (term.length > MIN_REGEX_LENGTH - 1 && term.startsWith('/') && term.endsWith('/')) {
    try {
      const regex = new RegExp(term.slice(1, -1), 'i');
      return (value: string) => regex.test(value);
    } catch {
      // An unfinished regex is a normal intermediate state while typing.
      return null;
    }
  }

  const lowered = term.toLowerCase();
  return (value: string) => value.toLowerCase().includes(lowered);
}

/** A block matches if the term hits either its name or its type. */
export function blockMatchesSearch(block: Pick<CityBlock, 'name' | 'type'>, matcher: SearchMatcher | null): boolean {
  if (!matcher) return false;

  return Boolean((block.name && matcher(block.name)) || (block.type && matcher(block.type)));
}

/** Ids of every block matching the term. Empty when the term matches nothing. */
export function findMatchingBlockIds(blocks: Record<number, CityBlock>, term: string): Set<number> {
  const matcher = createSearchMatcher(term);
  const matched = new Set<number>();
  if (!matcher) return matched;

  for (const [key, block] of Object.entries(blocks)) {
    if (blockMatchesSearch(block, matcher)) {
      matched.add(Number(key));
    }
  }

  return matched;
}
