import { castEe, createSpellService } from './castEe';

export const castEeOncePerSecond = async (entityIds: number[]) => {
  if (entityIds.length === 0) {
    return;
  }

  const service = createSpellService();
  if (!service) {
    console.error('ElvenAssist: SpellService not available, cannot cast EE');
    return;
  }
  for (const entityId of entityIds) {
    castEe(service, entityId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
