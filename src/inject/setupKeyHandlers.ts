let waitingForSecondKey = false;
let sequenceTimeout: ReturnType<typeof setTimeout> | null = null;

// Track which keys need their upcoming 'keyup' event blocked
const blockedKeyUps = new Set<string>();

const resetSequence = () => {
  waitingForSecondKey = false;
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout);
    sequenceTimeout = null;
  }
};

const keyHandler = (event: KeyboardEvent) => {
  // 1. Handle KeyUp: Block the up-stroke of any intercepted key
  if (event.type === 'keyup') {
    if (blockedKeyUps.has(event.code)) {
      event.preventDefault();
      event.stopPropagation();
      blockedKeyUps.delete(event.code); // Remove it once handled
    }
    return;
  }

  // 2. Handle KeyDown
  if (event.type === 'keydown') {

    // -- STATE: Waiting for the second key in the sequence --
    if (waitingForSecondKey) {
      // Ignore modifier keys so holding/releasing Alt doesn't break the sequence
      if (['Alt', 'Shift', 'Control', 'Meta'].includes(event.key)) {
        return;
      }

      // Ignore held-down repeats of the first key
      if (event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      resetSequence(); // Any standard keypress terminates the wait

      // We intercepted a second key. Always swallow its down-stroke AND up-stroke, 
      // regardless of whether it's valid or invalid.
      event.preventDefault();
      event.stopPropagation();
      blockedKeyUps.add(event.code);

      const payload = {
        sequence: `Alt+C -> ${event.code}`,
        code: event.code,
        altKey: event.altKey,
        type: event.type
      };

      window.postMessage({
        type: 'capturedAltC',
        payload,
      });
      return;
    }

    // -- STATE: Idle. Check for the initiating sequence (Alt + C) --
    if (event.code === 'KeyC' && event.altKey && !event.repeat && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();

      // Block the up-stroke for 'C'
      blockedKeyUps.add(event.code);
      waitingForSecondKey = true;

      // Timeout: Cancel the sequence if they don't press a second key within 2 seconds
      sequenceTimeout = setTimeout(() => {
        resetSequence();
      }, 2000);
    }
  }
};

export const setupKeyHandlers = () => {
  window.addEventListener('keydown', keyHandler, true);
  window.addEventListener('keyup', keyHandler, true);
  console.log('ElvenAssist: Key handlers set up');
};
