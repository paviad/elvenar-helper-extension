import { getFromStorage } from '../chrome/storage';

export const getMaxChapter = async (): Promise<number> => {
  const maxChapterRaw = await getFromStorage('maxChapter');
  if (maxChapterRaw) {
    return parseInt(maxChapterRaw, 10);
  } else {
    return 25; // Default max chapter if not set
  }
};
