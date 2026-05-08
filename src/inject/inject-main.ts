import { CustomWebSocket } from './customWebSocket';
import { castEe, createSpellService } from './gameops/castEe';
import { injectMutate } from './injectMutate';
import { setupKeyHandlers } from './setupKeyHandlers';
import { GlobalHttpInterceptorService } from './xhrInterceptor';

console.log('ElvenAssist: injected script loaded');

// Source - https://stackoverflow.com/a/75762050
// Posted by ProgrammingSauce, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-06, License - CC BY-SA 4.0

window.WebSocketUnchanged = window.WebSocket;

window.WebSocket = CustomWebSocket;
console.log('ElvenAssist: Finished adding interceptor to WebSocket');

const xhrInterceptor = new GlobalHttpInterceptorService();
console.log('ElvenAssist: Finished adding interceptor to XMLHttpRequest');

function onDOMContentLoaded() {
  injectMutate();
}

if (document.readyState !== 'loading') {
  onDOMContentLoaded();
} else {
  document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
}

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data.type !== 'CAST_EE') {
    return;
  }

  const payload = event.data.payload as number[];

  void castEeOncePerSecond(payload);
});

const castEeOncePerSecond = async (entityIds: number[]) => {
  if (entityIds.length === 0) {
    return;
  }

  const service = createSpellService();
  if (!service) {
    console.error('ElvenAssist: SpellService not available, cannot cast EE');
    return;
  }
  for (const entityId of entityIds) {
    castEe(service, entityId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

setupKeyHandlers();
