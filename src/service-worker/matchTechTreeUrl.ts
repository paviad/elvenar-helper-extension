import { saveToStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export function matchTechTreeUrl(
  details: {
    url: string;
    initiator?: string;
    originUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestBody?: any;
  },
  sharedInfo: ExtensionSharedInfo,
) {
  const techTreeUrlMatcher =
    /^https:\/\/ox.*\.innogamescdn\.com\/frontend\/.*\/assets\/atlas-techtree\.gui\.chapternavigation-[a-f0-9]+\.png$/;
  if (techTreeUrlMatcher.test(details.url)) {
    async function Do() {
      await saveToStorage('techTreeSpriteUrl', details.url);
    }
    Do();
  }
}
