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
    void sendPicksBackToElvenar(event.data.payload as string[], event.data.prob as string | undefined);
  }
});

const sendPicksBackToElvenar = async (picks: string[], prob?: string) => {
  await chrome.runtime.sendMessage({
    type: 'spirePicks',
    picks,
    prob,
  });
};

injectScriptTag();

function injectScriptTag() {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL('elvenassist-spirewizard-inject.bundle.js'));
  (document.head || document.documentElement).appendChild(script);
}
