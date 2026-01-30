export const formatResourceName = (goodsNames: Record<string, string>, boostedGoods: string[], name: string) => {
  if (name.startsWith('unit_')) {
    return (
      {
        unit_1: 'Light Melee',
        unit_2: 'Light Ranged',
        unit_3: 'Mage',
        unit_4: 'Heavy Melee',
        unit_5: 'Heavy Ranged',
      }[name] || name
    );
  }
  if (name.startsWith('boosted_')) {
    const match = /^boosted_(ascended_|sentient_|)plus_(\d)_quality_(\d)$/.exec(name);
    if (!match) return name;
    const [, type, plus, quality] = match;
    const startIndex = type === 'ascended_' ? 6 : type === 'sentient_' ? 3 : 0;
    const actualIndex = ((parseInt(quality) - 1 + parseInt(plus)) % 3) + startIndex;
    const adjustedName = boostedGoods[actualIndex];
    return goodsNames[adjustedName] || name;
  }
  return goodsNames[name] || name;
};
