import { TrainingBuilding, TroopType } from '../model/armyDetails';

/**
 * Good ids as the game spells them, which is what `SeasonalEvent.subType` and the province's
 * `good_id` carry. Note `magic_dust` rather than the "dust" players say.
 */
export type TournamentGood =
  | 'marble'
  | 'steel'
  | 'planks'
  | 'crystal'
  | 'scrolls'
  | 'silk'
  | 'elixir'
  | 'magic_dust'
  | 'gems';

/**
 * Tournaments run in this fixed rotation, so knowing the one that just ended is enough to name
 * the one coming up.
 */
export const TOURNAMENT_CYCLE: TournamentGood[] = [
  'marble',
  'steel',
  'planks',
  'crystal',
  'scrolls',
  'silk',
  'elixir',
  'magic_dust',
  'gems',
];

/** One suggestion from the guide. Alternates are its "also perhaps" picks. */
export interface TrainingSuggestion {
  building: TrainingBuilding;
  troopType: TroopType;
  /** False for the guide's second-choice units. */
  primary: boolean;
}

export interface TournamentGuide {
  good: TournamentGood;
  name: string;
  /** T1 fields one dominant enemy class, T2 two, T3 three. */
  tier: 1 | 2 | 3;
  dominant: TroopType[];
  difficulty?: string;
  training: TrainingSuggestion[];
  tips: string[];
}

const suggest = (building: TrainingBuilding, troopType: TroopType, primary = true): TrainingSuggestion => ({
  building,
  troopType,
  primary,
});

/**
 * Distilled from the player guide by SapphyreStarLight (Aug 2026). The guide names units
 * ("Treant", "Frog"); they are recorded here as building + class instead, so the view can resolve
 * each one to whatever the player actually has unlocked at whatever level.
 */
export const TOURNAMENT_GUIDES: Record<TournamentGood, TournamentGuide> = {
  marble: {
    good: 'marble',
    name: 'Marble',
    tier: 1,
    dominant: ['hm'],
    difficulty: 'Fairly easy',
    training: [
      suggest('eb', 'ma'),
      suggest('eb', 'lr', false),
      suggest('hb', 'ma'),
      suggest('hb', 'lr', false),
      suggest('tg', 'lr'),
      suggest('mc', 'ma'),
      suggest('mc', 'hr', false),
    ],
    tips: [
      'Around half the enemies are heavy melee, so an MMM boost with Priests or Blossom Mages works well — as does ELR with Crossbowmen or Dryads.',
      'Blossom Mage fares best here, but from about round 5 add Treants or Vallorian Guards for staying power.',
      'Add Frogs when the lineup holds light ranged: 3:2 mage to Frog, or 2:3 once there are 3 or more.',
      'Blossom Mage is the fastest mage and strikes first, the same advantage light ranged has.',
      'Consider catering when two or more Mistwalkers are in the lineup.',
    ],
  },
  steel: {
    good: 'steel',
    name: 'Steel',
    tier: 1,
    dominant: ['ma'],
    difficulty: 'Easy',
    training: [suggest('eb', 'lr'), suggest('hb', 'lr'), suggest('tg', 'lr'), suggest('mc', 'lr'), suggest('mc', 'ma', false)],
    tips: [
      'About half the enemies are mages, so ELR boosts with five Crossbowmen or five Rangers (3 star and up) do well on autofight.',
      'Against mages plus heavy melee, light ranged is best; once heavy ranged appears, Blossom Mage is the better pick.',
      'Cerberus are useful here too.',
      'With a maxed Dragon Abbey, Blossom Mages are very efficient against predominantly heavy melee and heavy ranged lineups.',
    ],
  },
  planks: {
    good: 'planks',
    name: 'Planks',
    tier: 1,
    dominant: ['lr'],
    difficulty: 'Moderate to hard',
    training: [
      suggest('eb', 'hr'),
      suggest('hb', 'hr'),
      suggest('hb', 'lr', false),
      suggest('tg', 'hr'),
      suggest('tg', 'lr', false),
      // "Drone Riders and Frogs" — the guide names both outright, neither as a fallback.
      suggest('mc', 'lm'),
      suggest('mc', 'hr'),
    ],
    tips: [
      'All three kinds of heavy ranged work this week, especially with an advanced Temple of the Toads.',
      'Golem becomes the most effective heavy ranged unit at higher levels; Frogs and Orc Strategists can get expensive.',
      'Mortars are good enough through roughly province 10 to 15, then fall off. Orc Strategist keeps working in later provinces.',
      'Use Frogs when the enemy lineup holds no more than one heavy melee or mage.',
      'Boosted light ranged does well against light ranged mixed with heavy melee or mages, even late.',
    ],
  },
  crystal: {
    good: 'crystal',
    name: 'Crystal',
    tier: 2,
    dominant: ['ma', 'hr'],
    difficulty: 'Medium to hard, easier for humans',
    training: [
      suggest('eb', 'hr'),
      suggest('hb', 'ma'),
      suggest('hb', 'hm', false),
      suggest('tg', 'lm'),
      // "Wardens, Blossom Mage" — Warden being the old name for the mercenary light ranged line,
      // whose 3 star tier the game now calls Pro Ranger. Both are named outright.
      suggest('mc', 'lr'),
      suggest('mc', 'ma'),
    ],
    tips: [
      'Mages are most useful when the enemy has two or fewer light ranged; use heavy ranged once there are more.',
      'Watch the mage count — at high rounds enemy mages tear through your heavy ranged.',
      'Priests do well against mostly heavy ranged and mages, and pair nicely with Pro Ranger.',
      'Golems are effective against light and heavy ranged with at most one mage.',
      'With a high Victory Springs, Cerberus handle mostly-mage lineups with one or two light melee, though Pro Ranger is still the best answer to mages.',
      'An MMM building or two helps a lot here.',
    ],
  },
  scrolls: {
    good: 'scrolls',
    name: 'Scrolls',
    tier: 2,
    dominant: ['lr', 'hr'],
    difficulty: 'Hard',
    training: [
      suggest('eb', 'hm'),
      suggest('hb', 'ma'),
      suggest('tg', 'hr'),
      suggest('tg', 'lr'),
      suggest('mc', 'lr'),
    ],
    tips: [
      'Plays much like Planks. Orc Warrior is useful in most encounters against light plus heavy ranged.',
      'Mortar substitutes for Orc Warrior but only in early provinces, to about province 12.',
      'Priest suits lineups of mostly heavy ranged with a few mages or heavy melee; Warden suits mostly light ranged with a few mages or heavy melee.',
      'Against mostly heavy ranged with fewer than two light ranged, mage units are very effective, especially with an MMM building.',
      'Heavy melee clears mostly-light-ranged lineups, and mixes well with mages once two or more light ranged are present.',
      'A UUU building or Dwarven Armorer is more necessary here than in T1, given the wider enemy variety.',
    ],
  },
  silk: {
    good: 'silk',
    name: 'Silk',
    tier: 2,
    dominant: ['lm', 'hm'],
    training: [
      suggest('eb', 'hm'),
      suggest('eb', 'hr', false),
      suggest('hb', 'hm'),
      suggest('hb', 'ma', false),
      suggest('tg', 'lr'),
      suggest('tg', 'hm', false),
      suggest('mc', 'ma'),
      suggest('mc', 'hr', false),
    ],
    tips: [
      'Blossom Princess and Frog together are the dominant pairing, at their best in manual battle: Frogs take the light melee first, then mage and Frog finish the heavy melee.',
      'On autobattle, Paladin and Blossom Princess are the most useful. Five Paladins against mostly light melee; five Princesses against mostly heavy ranged with one or two light melee.',
      'Avoid mages on auto against enemies carrying 5 swords towards mages.',
      'Treants work well with either heavy ranged or Blossom when facing light and heavy ranged mixes with two or more light ranged.',
    ],
  },
  elixir: {
    good: 'elixir',
    name: 'Elixir',
    tier: 3,
    dominant: ['lm', 'lr', 'hm'],
    training: [
      suggest('eb', 'hm'),
      suggest('eb', 'hr'),
      suggest('hb', 'hr'),
      suggest('hb', 'hm', false),
      suggest('hb', 'lr', false),
      suggest('tg', 'lr'),
      suggest('tg', 'hr', false),
      suggest('mc', 'hr'),
      suggest('mc', 'ma', false),
    ],
    tips: [
      'One or two Blossom Mages plus four Frogs are excellent at high rounds against light and heavy melee combinations — fight those manually.',
      'A good tournament for heavy ranged, especially with a high Temple of the Toads. On autoplay five Frogs or five Orc Strategists handle lineups with no more than one heavy melee.',
      'Mortars are fine in earlier provinces but too weak past about province 20.',
      'Mage troops work when the enemy has two or fewer light ranged; switch to heavy ranged beyond that.',
      'Against two or more Cerberus, use heavy melee if there are at most two light ranged, heavy ranged if there are more.',
      'Three dominant enemy classes means keeping a varied stock.',
    ],
  },
  magic_dust: {
    good: 'magic_dust',
    name: 'Magic Dust',
    tier: 3,
    dominant: ['lm', 'ma', 'hr'],
    difficulty: 'Difficult',
    training: [
      suggest('eb', 'hm'),
      suggest('hb', 'ma'),
      suggest('hb', 'hm', false),
      suggest('tg', 'lm'),
      suggest('mc', 'hr'),
      suggest('mc', 'hm'),
    ],
    tips: [
      'Vallorian is strong against heavy ranged and light melee with one or two mages — its attack against mages is solid once it reaches them.',
      'Light ranged, the highest-initiative unit, is not a major player here, so with boosts you can often strike before the enemy does.',
      'Priest suits mostly heavy ranged with a few mages; Cerberus suits mostly mages with a few light melee.',
      'Frog and Paladin both handle mostly light melee with a few heavy ranged.',
      'Another tournament that wants a varied stock.',
    ],
  },
  gems: {
    good: 'gems',
    name: 'Gems',
    tier: 3,
    dominant: ['lm', 'hm', 'hr'],
    difficulty: 'Hard',
    training: [
      suggest('eb', 'hm'),
      suggest('hb', 'ma'),
      suggest('hb', 'hm'),
      suggest('tg', 'lm'),
      suggest('tg', 'lr', false),
      suggest('tg', 'hm', false),
      suggest('mc', 'hr'),
      suggest('mc', 'hm', false),
      suggest('mc', 'ma', false),
    ],
    tips: [
      'Mercenary Camp troops at 3 star carry this one: Frogs against mostly light melee with a few heavy ranged, Vallorians against mostly heavy ranged with a few heavy melee, Blossom Mage against mostly heavy melee with some heavy ranged.',
      'Priest also works well, especially boosted, against mostly heavy melee and heavy ranged with at most one light melee.',
      'Training Grounds troops are the least useful here.',
      'Cerberus succeed when the enemy holds three or more light ranged or mages in the first four rounds, particularly with a good Victory Springs.',
      'After that, mix heavy melee and heavy ranged: 2 HM + 3 HR against three or more light ranged, 3 HM + 2 HR against two or more Cerberus or at most two light ranged.',
      'Do not use mages against a mix of Cerberus and light melee if you can avoid it.',
    ],
  },
};

/** The tournament that follows `good` in the rotation. */
export const nextTournament = (good: TournamentGood): TournamentGood =>
  TOURNAMENT_CYCLE[(TOURNAMENT_CYCLE.indexOf(good) + 1) % TOURNAMENT_CYCLE.length];

export const isTournamentGood = (value: string | undefined): value is TournamentGood =>
  !!value && TOURNAMENT_CYCLE.includes(value as TournamentGood);
