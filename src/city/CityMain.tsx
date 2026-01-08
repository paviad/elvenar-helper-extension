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
import { ProductionBadgeInfo } from './ProductionBadgeInfo';
import { ProductionTimeline } from './ProductionTimeline';

export function CityMain() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [CityEntityEx[], UnlockedArea[]]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState([] as UnlockedArea[]);

  const accountId = useTabStore((state) => state.accountId);

  const [f, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const [badgesInProduction, setBadgesInProduction] = React.useState<Record<string, Record<number, number>>>({});
  const [timestamp, setTimestamp] = React.useState(Date.now());

  React.useEffect(() => {
    async function fetchCityData() {
      if (!accountId) {
        return;
      }
      const entities = await generateCity(accountId);
      if (entities) {
        setCityEntities([entities.q, entities.unlockedAreas]);
        const badgesInProduction = extractBadgesInProduction(entities.q);
        setBadgesInProduction(badgesInProduction);
        setTimestamp(Date.now());
        console.log('Badges in production:', badgesInProduction);
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
        <Box>
          <ProductionTimeline badgesInProduction={badgesInProduction} timestamp={timestamp} />
        </Box>
      </Stack>
    </Container>
  );
}

function extractBadgesInProduction(entities: CityEntityEx[]): Record<string, Record<number, number>> {
  const fltr = (s: string) => (r: CityEntityEx) => r.state?.current_product?.asset_name === s;
  const mapr = (r: CityEntityEx) =>
    ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      name: r.state!.current_product!.name!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      asset_name: r.state!.current_product!.asset_name!,
      next_state_transition_in: r.state.next_state_transition_in,
      productionAmount: r.state?.current_product?.productionAmount,
    } satisfies ProductionBadgeInfo);

  const grpr = (acc: Record<number, number>, curr: ProductionBadgeInfo) => ({
    ...acc,
    [curr.next_state_transition_in]: (acc[curr.next_state_transition_in] || 0) + curr.productionAmount,
  });

  const grpi = () => ({} as Record<number, number>);

  const marble_2 = entities.filter(fltr('marble_2')).map(mapr).reduce(grpr, grpi());
  const marble_3 = entities.filter(fltr('marble_3')).map(mapr).reduce(grpr, grpi());
  const steel_2 = entities.filter(fltr('steel_2')).map(mapr).reduce(grpr, grpi());
  const steel_3 = entities.filter(fltr('steel_3')).map(mapr).reduce(grpr, grpi());
  const planks_2 = entities.filter(fltr('planks_2')).map(mapr).reduce(grpr, grpi());
  const planks_3 = entities.filter(fltr('planks_3')).map(mapr).reduce(grpr, grpi());
  const supplies_0 = entities.filter(fltr('supplies_0')).map(mapr).reduce(grpr, grpi());
  const supplies_3 = entities.filter(fltr('supplies_3')).map(mapr).reduce(grpr, grpi());
  const supplies_4 = entities.filter(fltr('supplies_4')).map(mapr).reduce(grpr, grpi());
  const supplies_5 = entities.filter(fltr('supplies_5')).map(mapr).reduce(grpr, grpi());

  return {
    marble_2,
    marble_3,
    steel_2,
    steel_3,
    planks_2,
    planks_3,
    supplies_0,
    supplies_3,
    supplies_4,
    supplies_5,
  };
}
