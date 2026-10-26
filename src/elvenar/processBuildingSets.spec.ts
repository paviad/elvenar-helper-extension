import { clearStorage, stored } from '../testing/fakeStorage';
import { getBuildingSets } from './getBuildingSets';
import { processBuildingSets } from './processBuildingSets';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('../chrome/storage', () => require('../testing/fakeStorage').storageModule);

/** One set as the game's `SetBuildings` file has it (2026-10-26), cut to two pieces and two bonuses. */
const file = JSON.stringify([
  {
    __class__: 'BuildingSetVO',
    id: 'shuffle_garden_xxvi',
    name: 'Boughsong Terraces',
    buildings: [
      {
        __class__: 'SetBuildingVO',
        baseName: 'A_Evt_Set_Shuffle_Garden_XXVI_Boughsong_Harping_Hollow',
        bonuses: [
          { __class__: 'SetBonusVO', adjacencyCount: 1, type: 'self', factor: 0.3 },
          { __class__: 'SetBonusVO', adjacencyCount: 2, type: 'marble', factor: 0.6 },
        ],
      },
      { __class__: 'SetBuildingVO', baseName: 'A_Evt_Set_Shuffle_Garden_XXVI_Boughsong_Assembling_Steps' },
    ],
  },
]);

beforeEach(clearStorage);

describe('processBuildingSets', () => {
  it('keeps each set with the pieces in it and what they give for touching neighbours', async () => {
    await processBuildingSets(file);

    expect(await getBuildingSets()).toEqual([
      {
        id: 'shuffle_garden_xxvi',
        name: 'Boughsong Terraces',
        pieces: [
          {
            baseName: 'A_Evt_Set_Shuffle_Garden_XXVI_Boughsong_Harping_Hollow',
            bonuses: [
              { adjacencyCount: 1, type: 'self', factor: 0.3 },
              { adjacencyCount: 2, type: 'marble', factor: 0.6 },
            ],
          },
          { baseName: 'A_Evt_Set_Shuffle_Garden_XXVI_Boughsong_Assembling_Steps', bonuses: [] },
        ],
      },
    ]);
  });

  it('leaves the game’s class names behind', async () => {
    await processBuildingSets(file);

    expect(stored.buildingSets).not.toContain('__class__');
  });

  it('has no sets before the game has sent its file', async () => {
    expect(await getBuildingSets()).toEqual([]);
  });
});
