export const createSpellService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.shared.spells.services.SpellService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const castEe = (spellService: ReturnType<typeof createSpellService>, buildingId: number) => {
  const spellName = 'spell_neighborly_help_boost_1';
  spellService?.castSpellOnBuilding(spellName, buildingId, (response) => {
    console.log('E Cast spell response:', response);
  });
};
