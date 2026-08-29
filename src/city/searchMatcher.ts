import { CityBlock } from './CityBlock';

/** Shortest input treated as a regex, i.e. the two slashes plus one character. */
const MIN_REGEX_LENGTH = 3;

/**
 * A footprint, whole or in part: "7x3", "7x" for anything seven wide, "x3" for
 * anything three long. A bare "x" is not a size, so it still searches the names.
 */
const SIZE_TERM = /^(\d+x\d*|\d*x\d+)$/;

/** The fields of a block the search box can match against. */
export type SearchableBlock = Pick<CityBlock, 'name' | 'type' | 'width' | 'length'>;

export type SearchMatcher = (block: SearchableBlock) => boolean;

/**
 * Builds a matcher for the city search box. A term wrapped in slashes is a
 * case-insensitive regular expression over the name and type; a footprint
 * ("7x3", "7x", "x3") is compared with the width and length; anything else is a
 * substring of the name or type.
 *
 * Returns null when nothing should match: an empty term, or a regex that does
 * not compile.
 */
export function createSearchMatcher(term: string): SearchMatcher | null {
  if (!term) return null;

  if (term.length > MIN_REGEX_LENGTH - 1 && term.startsWith('/') && term.endsWith('/')) {
    try {
      const regex = new RegExp(term.slice(1, -1), 'i');
      return matchingText((value) => regex.test(value));
    } catch {
      // An unfinished regex is a normal intermediate state while typing.
      return null;
    }
  }

  if (SIZE_TERM.test(term)) {
    // Either dimension may be left out, and then any value of it will do.
    const [width, length] = term.split('x');
    return (block) =>
      (width === '' || block.width === Number(width)) && (length === '' || block.length === Number(length));
  }

  const lowered = term.toLowerCase();
  return matchingText((value) => value.toLowerCase().includes(lowered));
}

/** A matcher that passes a block when the test passes on its name or its type. */
function matchingText(test: (value: string) => boolean): SearchMatcher {
  return (block) => Boolean((block.name && test(block.name)) || (block.type && test(block.type)));
}

/** Ids of every block matching the term. Empty when the term matches nothing. */
export function findMatchingBlockIds(blocks: Record<number, CityBlock>, term: string): Set<number> {
  const matcher = createSearchMatcher(term);
  const matched = new Set<number>();
  if (!matcher) return matched;

  for (const [key, block] of Object.entries(blocks)) {
    if (matcher(block)) {
      matched.add(Number(key));
    }
  }

  return matched;
}
