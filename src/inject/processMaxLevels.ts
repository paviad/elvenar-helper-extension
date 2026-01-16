import { GoodsBuildingRaw, GoodsBuilding } from '../model/goodsBuilding';
import { getPrefix } from '../util/getPrefix';

export function processMaxLevels(responseText: string) {
  const json = JSON.parse(responseText);

  const goodsRenderConfig = (json.building_configs as GoodsBuildingRaw[]).map(
    (r) =>
      ({
        t: r.type,
        id: r.id,
        w: r.tile_width,
        l: r.tile_length,
      } as GoodsBuilding),
  );

  const maxLevels = goodsRenderConfig
    .filter((r) => /^[GPRHMOYDBZ]_/.test(r.id))
    .map((r) => ({
      prefix: getPrefix(r.id, r.t),
      level: Number(/_(\d+)$/.exec(r.id)?.[1]),
    }))
    .reduce(
      (acc, curr) => ({
        ...acc,
        [curr.prefix]: Math.max(acc[curr.prefix] || 0, curr.level),
      }),
      {} as Record<string, number>,
    );

  return { maxLevels };
}

