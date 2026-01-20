import { saveToStorage } from '../chrome/storage';

export const processPremiumBuildingHints = async (responseText: string) => {
  const premiumBuildingHintsRaw = JSON.parse(responseText) as { id: string; section: string }[];

  const premiumBuildingHints = premiumBuildingHintsRaw.map((z) => ({ id: z.id, section: z.section }));

  await setPremiumBuildingHints(premiumBuildingHints);
};

async function setPremiumBuildingHints(hints: { id: string; section: string }[]) {
  const plain = JSON.stringify(hints);
  await saveToStorage('premiumBuildingHints', plain);
}
