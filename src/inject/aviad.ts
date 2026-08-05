import { GameVars } from './gameVars';

declare global {
  interface Window {
    gameVars: GameVars;
    compVer: (v2: string) => number;
    WebSocketUnchanged: typeof WebSocket;
    aviad_am: {
      get_isLoading(): boolean;
      injector: {
        getOrCreateNewInstance: <T>(ctor: new () => T, ...args: unknown[]) => T;
      };
    };
  }
}
