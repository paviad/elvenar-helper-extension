import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';
import { CityEntityEx } from '../model/cityEntity';
import { CityBlock } from './CityBlock';
import { CityView } from './CityView';
import { UnlockedArea } from '../model/unlockedArea';
import { generateCityBlocks } from './generateCityBlocks';

import { useTabStore } from '../util/tabStore';
import { generateCity } from './generateCity';
import { generateUnlockedAreas } from './generateUnlockedAreas';
import { ProductionTimeline } from '../fellowship-adventure/ProductionTimeline';
import { getAccountById } from '../elvenar/AccountManager';

export function CityMain() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);

  const accountId = useTabStore((state) => state.accountId);

  const [f, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    async function fetchCityData() {
      if (!accountId) {
        return;
      }
      const accountData = getAccountById(accountId);
      if (!accountData || !accountData.cityQuery) {
        return;
      }
      const entities = await generateCity(accountData);
      if (entities) {
        setCityEntities([entities.q, entities.unlockedAreas]);
      }
    }
    fetchCityData();
  }, [accountId, f]);

  React.useEffect(() => {
    async function updateBlocks() {
      const blocks = await generateCityBlocks(cityEntities[0]);
      const unlockedAreas = generateUnlockedAreas(cityEntities[1]);
      setBlocks(blocks);
      setUnlockedAreas(unlockedAreas);
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
