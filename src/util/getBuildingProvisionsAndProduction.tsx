import { BuildingEx } from '../model/buildingEx';

export function getBuildingProvisionsAndProduction(building: BuildingEx, keysSet: Set<string>) {
  const rowProvisions: Record<string, number> = {};
  const rowProduction: Record<string, number> = {};
  const provisions = building.sourceBuilding.provisions?.resources?.resources;
  if (provisions) {
    Object.entries(provisions).forEach(([k, v]) => {
      if (k !== 'prosperity' && v > 0) {
        rowProvisions[k] = (rowProvisions[k] || 0) + v;
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
