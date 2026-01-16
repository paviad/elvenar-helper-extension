export const processAwBuildings = (responseText: string) => {
  const goodsRaw = JSON.parse(responseText) as { id: string; name: string }[];

  const goods = goodsRaw
    .filter((r) => /aw.*?_shards$/.test(r.id) && r.name !== '!!Missing text')
    .map((r) => ({ id: r.id, name: r.name }));

  return { awBuildings: goods };
};
