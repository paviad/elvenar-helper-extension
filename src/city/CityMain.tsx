import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';
import { CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';
import { CityView } from './CityView';
import { UnlockedArea } from '../model/unlockedArea';
import { generateCityBlocks } from './generateCityBlocks';

import { useGlobalStore } from '../util/globalStore';
import { generateCity } from './generateCity';
import { generateUnlockedAreas } from './generateUnlockedAreas';

export function CityMain() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);

  const accountId = useGlobalStore((state) => state.accountId);

  const [f, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    async function fetchCityData() {
      if (!accountId) {
        return;
      }
      const entities = await generateCity(accountId);
      if (entities) {
        setCityEntities([entities.q, entities.unlockedAreas]);
      }
    }
    fetchCityData();
  }, [accountId, f]);

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
          <CityView blocks={blocks} unlockedAreas={unlockedAreas} forceUpdate={forceUpdate} />
        </Box>
      </Stack>
    </Container>
  );
}
