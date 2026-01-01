import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';
import { getCityEntities, getUnlockedAreas, sendCityDataQuery } from '../elvenar/sendCityDataQuery';
import { CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';
import { CityView } from './CityView';
import { UnlockedArea } from '../model/unlockedArea';
import { generateCityBlocks } from './generateCityBlocks';
import { BuildingFinder } from './buildingFinder';

export function CityMain() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);

  React.useEffect(() => {
    async function fetchCityData() {
      await generateCity(setCityEntities);
    }
    fetchCityData();
  }, []);

  React.useEffect(() => {
    async function updateBlocks() {
      const blocks = await generateCityBlocks(cityEntities[0]);
      const unlockedAres = generateUnlockedAreas(cityEntities[1]);
      setBlocks(blocks);
      setUnlockedAreas(unlockedAres);
    }
    updateBlocks();
  }, [cityEntities]);

  return (
    <Container maxWidth={false} sx={{ maxWidth: 'none' }}>
      <Stack>
        <Stack direction={'row'}>{/* <Button onClick={() => moveBuildingTest()}>Test Move Building</Button> */}</Stack>
        <Box>
          <CityView blocks={blocks} unlockedAreas={unlockedAreas} />
        </Box>
      </Stack>
    </Container>
  );
}

function generateUnlockedAreas(unlockedAreas: UnlockedArea[]): UnlockedArea[] {
  return unlockedAreas.map((r) => ({ ...r, x: r.x || 0, y: r.y || 0 }));
}

async function generateCity(setCityEntities: React.Dispatch<React.SetStateAction<[CityEntityEx[], UnlockedArea[]]>>) {
  await sendCityDataQuery();
  // await sendInventoryQuery();

  const finder = new BuildingFinder();
  await finder.ensureInitialized();

  const cityEntities = getCityEntities();
  const unlockedAreas = getUnlockedAreas();

  const q = cityEntities.map((entity) => ({
    ...entity,
    ...finder.getCityEntityExtraData(entity.cityentity_id, entity.level),
  })) satisfies CityEntityEx[];

  setCityEntities([q, unlockedAreas]);
}
