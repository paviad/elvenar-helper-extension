// Start a production option on one or more buildings, the way the production window does:
// dispatch ONE `StartProductionEvent::startProduction` with the qualifying buildings and the
// option's `optionId`. `StartProductionsCommand` pauses each idle state, shows the cost blimps,
// subtracts the summed inputs locally and calls `CityProductionService.startProductions(ids, optionId, 1)`
// (one `startProductions [[ids], optionId, 1]` request). The command checks nothing itself, so the
// guards the UI applies are replicated here, per building. (rev-eng/09 §4.2, R3; 06 §4.15)
import { AviadCityMapEntity } from '../aviad';

export const localStartProduction = ({ ids, optionId }: { ids: number[]; optionId: number }) => {
  const classes = window.aviad;
  const injector = window.aviad_am.injector;

  const entitiesModel = injector.getInstance(classes['de.innogames.strategycity.main.model.ICityEntitiesModel']);
  const resourcesModel = injector.getInstance(classes['de.innogames.onyx.resources.models.ResourcesModel']);
  const resourceCollectionCtor = classes['de.innogames.collections.resources.ResourceCollection'];

  const buildings: AviadCityMapEntity[] = [];
  let totalCost = new resourceCollectionCtor();
  for (const id of ids) {
    const entity = entitiesModel.getEntityById(id);
    if (!entity) {
      console.trace(`localStartProduction: no city entity with id ${id}`);
      continue;
    }
    // The producing window would ask "replace the running production?" - never do that silently.
    const stateId = entity.get_state().get_stateId();
    if (stateId !== 'idle') {
      console.log('E localStartProduction: entity is not idle, skipped', id, stateId);
      continue;
    }
    const product = entity.get_entityConfig().get_production().getProductById(optionId);
    if (!product || product.get_isLocked()) {
      console.log('E localStartProduction: no such (unlocked) production option, skipped', id, optionId);
      continue;
    }
    // Like the window's "start all": start as many as the stock pays for (each building's own cost -
    // levels may differ), in the order given, and stop at the first one that is not affordable.
    const costWithThisOne = totalCost.clone();
    costWithThisOne.add(product.get_requiredInput());
    if (!resourcesModel.hasEnoughResourcesFor(costWithThisOne)) {
      console.log('E localStartProduction: not enough resources from this building on, stopped', id, optionId);
      break;
    }
    totalCost = costWithThisOne;
    buildings.push(entity);
  }
  if (buildings.length === 0) {
    console.log('E localStartProduction: nothing to start', ids, optionId);
    return;
  }

  const dispatcher = injector.getInstance(classes['openfl.events.IEventDispatcher']);
  const startProductionEventCtor = classes['de.innogames.strategycity.main.controller.event.StartProductionEvent'];
  dispatcher.dispatchEvent(
    new startProductionEventCtor('StartProductionEvent::startProduction', buildings, optionId, 1),
  );
};
