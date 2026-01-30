import { BuildingEx } from '../model/buildingEx';
import { StageProvision } from '../model/stageProvision';

export function getBuildingProvisionsAndProduction(
  building: BuildingEx,
  keysSet: Set<string>,
  evolvingBuildings: StageProvision[],
  stage?: number,
) {
  const evolvingBuilding = evolvingBuildings.find((eb) => eb.baseName === building?.sourceBuilding.base_name);
  const cultureFactor = evolvingBuilding?.stages.find((s) => s.id === stage)?.culture || 1;
  const populationFactor = evolvingBuilding?.stages.find((s) => s.id === stage)?.population || 1;

  const rowProvisions: Record<string, number> = {};
  const rowProduction: Record<string, number> = {};
  const provisions = building.sourceBuilding.provisions?.resources?.resources;
  if (provisions) {
    Object.entries(provisions).forEach(([k, v]) => {
      if (k !== 'prosperity' && v > 0) {
        rowProvisions[k] =
          (rowProvisions[k] || 0) +
          Math.floor(v * (k === 'culture' ? cultureFactor : k === 'population' ? populationFactor : 1));
        keysSet.add(k);
      }
    });
  }

  // B. Calculate Production (Normalized to 24h)
  const production = building.sourceBuilding.production;
  if (production && production.products) {
    production.products.forEach((product) => {
      const pTime = product.production_time;
      if (!pTime || pTime <= 0) return;

      const dailyFactor = 86400 / pTime;

      if (product.revenue?.resources) {
        Object.entries(product.revenue.resources).forEach(([resName, amount]) => {
          if (!['mana', 'orcs', 'seeds', 'unurium'].includes(resName)) {
            return;
          }

          const dailyAmount = amount * dailyFactor;
          const currentMax = rowProduction[resName] || 0;
          if (dailyAmount > currentMax) {
            rowProduction[resName] = dailyAmount;
            keysSet.add(resName);
          }
        });
      }
    });
  }

  return { provisions: rowProvisions, production: rowProduction };
}
