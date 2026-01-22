export function guessRankingPointsFromChapter(chapter: number): number {
  // Simple heuristic: assume each chapter gives 100 ranking points
  return chapter * chapter * 8000;
}
