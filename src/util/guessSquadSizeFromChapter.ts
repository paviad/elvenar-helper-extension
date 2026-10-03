const maxUpgradeIndexByChapter = [
  0, 3, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 71, 75, 79, 83, 87, 91,
];

const squadSizeIncrementByUpgrade = [
  6, 3, 6, 9,
  // Chapter 2
  12, 15, 18,
  // Chapter 3
  21, 24, 27,
  // Chapter 4
  30, 33, 36,
  // Chapter 5
  39, 42, 45,
  // Chapter 6
  48, 51, 54, 57,
  // Chapter 7
  60, 63, 66, 69,
  // Chapter 8
  72, 75, 78, 81,
  // Chapter 9
  84, 87, 90, 93,
  // Chapter 10
  96, 99, 102, 105,
  // Chapter 11
  108, 111, 114, 117,
  // Chapter 12
  120, 123, 126, 129,
  // Chapter 13
  132, 135, 138, 141,
  // Chapter 14
  144, 147, 150, 153,
  // Chapter 15
  156, 159, 162, 165,
  // Chapter 16
  168, 171, 174, 177,
  // Chapter 17
  180, 183, 186, 189,
  // Chapter 18
  192, 195, 198, 201,
  // Chapter 19
  204, 207, 210, 213,
  // Chapter 20
  216, 219, 222, 225,
  // Chapter 21
  505, 505, 534, 600,
  // Chapter 22
  600, 700, 700, 700,
  // Chapter 23
  800, 800, 800, 900,
  // Chapter 24
  1000, 1000, 1100, 1200,
  // Chapter 25
  1200, 1200, 1300, 1300,
];

export function guessSquadSizeFromChapter(chapter: number): number {
  const maxUpgradeIndex = maxUpgradeIndexByChapter[chapter] || 1000;
  let squadSize = 0;

  // guessing final tech wasn't researched, so taking all but final increment.
  for (let i = 0; i <= maxUpgradeIndex - 1; i++) {
    squadSize += squadSizeIncrementByUpgrade[i] || 0;
  }
  return squadSize;
}
