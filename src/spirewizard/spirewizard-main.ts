console.log('ElvenAssist: Spire Wizard Main Module Loaded');

chrome.runtime.onMessage.addListener(
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: { type: string; payload: any },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): boolean | undefined => {
    if (message.type === 'spireEncounterStarted') {
      window.postMessage(
        {
          type: 'spireEncounterStarted',
          payload: message.payload.encounterData,
          source: 'spirewizard-main',
        },
        '*',
      );
    }

    if (message.type === 'spireDiplomacySubmit') {
      window.postMessage(
        {
          type: 'spireDiplomacySubmit',
          payload: message.payload.diplomacySubmitData,
          source: 'spirewizard-main',
        },
        '*',
      );
    }

    return undefined;
  },
);

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }
  if (event.data?.type === 'spirePicks') {
    void sendPicksBackToElvenar({
      picks: event.data.payload as string[],
      prob: event.data.prob as string | undefined,
      jokerGhost: event.data.jokerGhost as number | undefined,
      turn: event.data.turn as number | undefined,
      status: event.data.status as 'waiting' | 'timeout' | undefined,
    });
  }
});

const sendPicksBackToElvenar = async (payload: {
  picks: string[];
  prob?: string;
  jokerGhost?: number;
  turn?: number;
  status?: 'waiting' | 'timeout';
}) => {
  await chrome.runtime.sendMessage({
    type: 'spirePicks',
    ...payload,
  });
};

injectScriptTag();

function injectScriptTag() {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL('elvenassist-spirewizard-inject.bundle.js'));
  (document.head || document.documentElement).appendChild(script);
}
