import {
  createTournamentService,
  createUnlockEncounterService,
  createWorldMapTournamentService,
  getProvincesOverview,
  getTournamentOverview,
  unlockEncounter,
} from './tourny';

export const tournyCater = async (payload: { q: number; r: number }) => {
  const unlockEncounterService = createUnlockEncounterService();
  unlockEncounter(unlockEncounterService, payload);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const tournamentService = createTournamentService();
  getTournamentOverview(tournamentService);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const worldMapTournamentService = createWorldMapTournamentService();
  getProvincesOverview(worldMapTournamentService);
};
