import { sendRuntime } from '../chrome/messages';
import { GAME_CLIENT_SCRIPT_REGEX } from '../elvenar/buildingPreviews';
import { RENDER_CONFIG_REGEX } from '../elvenar/buildingRenders';

const isGameClientScript = (target: EventTarget | null): target is HTMLScriptElement =>
  (target as Element | null)?.tagName === 'SCRIPT' && GAME_CLIENT_SCRIPT_REGEX.test((target as HTMLScriptElement).src);

/**
 * Tells the service worker which client script the game runs, so it can read the building pictures'
 * file names out of it. The game adds the script tag only once its preloader is done, which is
 * usually after this runs, so then it waits for the script to load. A script's load event does not
 * bubble, hence the listener in the capture phase.
 */
export function reportGameClientScript() {
  const report = (script: HTMLScriptElement) => void sendRuntime('gameClientScript', { url: script.src });

  const present = Array.from(document.scripts).find(isGameClientScript);
  if (present) {
    report(present);
    return;
  }

  const onLoad = (event: Event) => {
    if (!isGameClientScript(event.target)) return;
    document.removeEventListener('load', onLoad, true);
    report(event.target);
  };
  document.addEventListener('load', onLoad, true);
}

/**
 * Tells the service worker which render config the game loaded, so it can read how buildings are
 * drawn. The game fetches it at startup, often before this runs, so loads already made are looked
 * through as well as the ones to come.
 */
export function reportGameRenderConfig() {
  const observer = new PerformanceObserver((list) => {
    const entry = list.getEntries().find((e) => RENDER_CONFIG_REGEX.test(e.name));
    if (!entry) return;
    observer.disconnect();
    void sendRuntime('gameRenderConfig', { url: entry.name });
  });
  observer.observe({ type: 'resource', buffered: true });
}
