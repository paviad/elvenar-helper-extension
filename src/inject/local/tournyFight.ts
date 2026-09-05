import { TournyFight } from '../../model/tourny/tournyFight';
import {
  createBattlefieldService,
  createTournamentService,
  createWorldMapTournamentService,
  getProvincesOverview,
  getTournamentOverview,
  instantBattle,
} from './tourny';

export const tournyFight = async (fightData: TournyFight) => {
  const service = createBattlefieldService();
  instantBattle(service, fightData);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const tournamentService = createTournamentService();
  getTournamentOverview(tournamentService);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const worldMapTournamentService = createWorldMapTournamentService();
  getProvincesOverview(worldMapTournamentService);
};
