import { RecruitDiagnostic, RecruitStage } from '../recruits/recruitBook';
import { MessageResponse } from './messages';

declare module './messages' {
  interface RuntimeMessages {
    /**
     * Sent by the overlay to change one candidate by hand: move their stage, set the notes, or drop
     * them from the book altogether. The service worker makes the change, as the book's one writer.
     */
    editRecruit: {
      accountId: string;
      playerId: number;
      stage?: RecruitStage;
      notes?: string;
      remove?: boolean;
      restore?: boolean;
    };
    /**
     * Sent by the overlay when something went wrong outside the service worker - in the page, or
     * a score that never came back - so it is kept with the recruits like everything else.
     */
    recordRecruitDiagnostic: { accountId: string; diagnostic: RecruitDiagnostic; stopRefresh: boolean };
    /** Sent by the overlay to forget the diagnostics and let the score refresher run again. */
    clearRecruitDiagnostics: { accountId: string };
    /** Sent by the overlay to ask ElvenStats about one candidate. The service worker fetches. */
    lookUpElvenStats: { accountId: string; playerId: number };
    /** Sent by the overlay to have ElvenStats rescan one candidate, then look them up again. */
    refreshElvenStats: { accountId: string; playerId: number };
  }

  interface MessageResponses {
    editRecruit: MessageResponse;
    recordRecruitDiagnostic: MessageResponse;
    clearRecruitDiagnostics: MessageResponse;
    lookUpElvenStats: MessageResponse;
    refreshElvenStats: MessageResponse;
  }
}
