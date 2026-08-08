/**
 * Whether two offered-goods lists say the same thing. The game refetches the trade list on its
 * own and usually gets back what it already had, so the overlay compares before it reacts.
 * Order is incidental: the lists come out of a Set over whatever order the trades arrived in.
 */
export const sameOfferedGoods = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
