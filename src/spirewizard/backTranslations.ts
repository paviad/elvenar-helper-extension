import { translationsMobile } from './translationsMobile';

export const backTranslations: Record<string, string> = Object.fromEntries(
  Object.entries(translationsMobile).map(([key, value]) => [value, key]),
);
