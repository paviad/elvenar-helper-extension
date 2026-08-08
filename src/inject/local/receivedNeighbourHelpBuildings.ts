import { NeighbourHelpData } from '../../model/neighbourHelpBuildings';
import { createNeighbourlyHelpService } from './neighbourlyHelp';

export const receivedNeighbourHelpBuildings = (neighbourHelpData: NeighbourHelpData) => {
  const service = createNeighbourlyHelpService();

  const buildings = neighbourHelpData.buildings;

  const mainHall = buildings.find((r) => r.entityId === 1)!;
  const builders = buildings.find((r) => r.entityId === 2);
  const culture = buildings.find((r) => r.entityId !== 1 && r.entityId !== 2);

  const playerId = neighbourHelpData.player.player_id;

  if (builders) {
    service?.performAction('limited_help', builders.entityId, playerId, (response) => {
      console.log('E Perform help response for builders:', response);
    });
  } else if (culture) {
    service?.performAction('time_limited_help', culture.entityId, playerId, (response) => {
      console.log('E Perform help response for culture building:', response);
    });
  } else {
    service?.performAction('unlimited_help', mainHall.entityId, playerId, (response) => {
      console.log('E Perform help response for main hall:', response);
    });
  }
};
