export const localOpenAw = (playerId: number, buildingId: string, baseName: string) => {
  console.log(
    `localOpenAw: Opening Ancient Wonder for playerId: ${playerId}, buildingId: ${buildingId}, baseName: ${baseName}`,
  );
  const cmdCtor = window.aviad['de.innogames.onyx.city.ancientwonders.commands.DisplayAncientWonderCommand'];
  const cmd = window.aviad_am.injector.getOrCreateNewInstance(cmdCtor);
  const evtCtor = window.aviad['de.innogames.onyx.shared.events.AncientWondersDataEvent'];
  const enumCtor = window.aviad_enum['de.innogames.onyx.shared.events.LoadType'];
  const enumObj = enumCtor.LOAD_ONLY(buildingId, baseName);
  const evt = new evtCtor('displayAncientWonder', playerId, enumObj, 'window_0');
  cmd.event = evt;
  cmd.execute();
};
