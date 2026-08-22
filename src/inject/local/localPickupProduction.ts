// Collect a building's finished production the way a click on it would, minus the mouse:
// dispatch `ProductionEvent::pickupProduction` on the city context dispatcher.
// `PickupProductionCommand` then chooses the picker for the entity type, checks `canPickup`
// (storage not capped + `entity.canCollect()`) and calls `CityProductionService.pickupProduction(id)`,
// which batches ids for 1 s into one `pickupProduction [[id, ...]]` request. (rev-eng/09 §4.3, R2)
export const localPickupProduction = (id: number) => {
  const classes = window.aviad;
  const injector = window.aviad_am.injector;

  const entitiesModel = injector.getInstance(classes['de.innogames.strategycity.main.model.ICityEntitiesModel']);
  const entity = entitiesModel.getEntityById(id);
  if (!entity) {
    console.trace(`localPickupProduction: no city entity with id ${id}`);
    return;
  }
  // The command would open the building window instead of collecting - do not get there.
  if (!entity.canCollect()) {
    console.log('E localPickupProduction: entity is not collectable', id);
    return;
  }

  const dispatcher = injector.getInstance(classes['openfl.events.IEventDispatcher']);
  const productionEventCtor = classes['de.innogames.strategycity.main.controller.event.ProductionEvent'];
  dispatcher.dispatchEvent(new productionEventCtor('ProductionEvent::pickupProduction', entity));
};
