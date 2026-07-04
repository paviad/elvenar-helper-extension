import { TournyFight } from '../../model/tourny/tournyFight';
import { createWorldMapService } from './neighbourlyHelp';

export const createBattlefieldService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.worldmap.service.WorldMapBattleService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const createTournamentService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.tournaments.services.TournamentService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const createWorldMapTournamentService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.tournaments.services.WorldMapTournamentService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const createUnlockEncounterService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.worldmap.service.UnlockEncounterService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const instantBattle = (service: ReturnType<typeof createBattlefieldService>, fightData: TournyFight) => {
  const { q, r, unit } = fightData;

  const units = [unit, unit, unit, unit, unit]; // Assuming you want to send 5 squads of the same unit, adjust as necessary
  service
    ?.request('instantBattle')
    .withData([r, q, 0, units])
    .withCallback((response) => {
      console.log('E Instant battle response:', response);
    })
    .immediate()
    .call();
};

export const getTournamentOverview = (service: ReturnType<typeof createTournamentService>) => {
  service?.getTournamentProgress((response) => {
    console.log('E Tournament overview response:', response);
  });
};

export const getProvincesOverview = (service: ReturnType<typeof createWorldMapTournamentService>) => {
  service?.getProvincesOverview((response) => {
    console.log('E Provinces overview response:', response);
  });
};

export const getProvinceInformation = (
  service: ReturnType<typeof createWorldMapService>,
  fightData: Omit<TournyFight, 'unit'>,
) => {
  const { q, r } = fightData;
  service
    ?.request('getProvinceInformation')
    .withData([r, q])
    .withCallback((response) => {
      console.log('E Province information response:', response);
    })
    .immediate()
    .call();
};

export const unlockEncounter = (
  service: ReturnType<typeof createUnlockEncounterService>,
  fightData: Omit<TournyFight, 'unit'>,
) => {
  const { q, r } = fightData;
  service?.unlockEncounter(q, r, 0, (response) => {
    console.log('E Unlock encounter response:', response);
  });
};
