/**
 * Knowledge you have put into other players' wonders.
 *
 * The game never says how much a contribution was. What it does say, in the phase it sends back
 * afterwards, is your running total in that wonder's current level — so a gift is read as the
 * rise in that total since it was last seen. That holds for every way of giving: knowledge
 * points, rune shards and inventory items all answer with the same phase.
 */
export interface KpGift {
  /** The wonder's owner. */
  ownerId: number;
  /** Matches `Building.base_name`. */
  baseName: string;
  amount: number;
  /** Seconds since the epoch, to line up with the game's own post timestamps. */
  at: number;
}

/** Your running total in one wonder's level, as last reported. */
export interface KpStanding {
  mine: number;
  /** The level's requirement, which is what tells one level from the next. */
  required: number;
  seenAt: number;
}

export interface KpGiven {
  /** Keyed `${ownerId}:${baseName}`. */
  standing: Record<string, KpStanding>;
  gifts: KpGift[];
}
