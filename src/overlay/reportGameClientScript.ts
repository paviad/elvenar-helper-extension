import { sendRuntime } from '../chrome/messages';
import { GAME_CLIENT_SCRIPT_REGEX } from '../elvenar/buildingPreviews';

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
