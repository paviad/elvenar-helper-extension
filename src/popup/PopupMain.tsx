import * as React from 'react';
import { Box, Button, Container, Stack } from '@mui/material';
import { sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import {
  getBuildings,
  sendBuildingsQuery,
} from '../elvenar/sendBuildingsQuery';
import {
  getCityEntities,
  getUnlockedAreas,
  sendCityDataQuery,
} from '../elvenar/sendCityDataQuery';
import {
  getGoodsBuildings,
  sendRenderConfigQuery,
} from '../elvenar/sendRenderConfigQuery';
import { Building } from '../model/building';
import { GoodsBuilding } from '../model/goodsBuilding';
import { CityEntity } from '../model/cityEntity';
import { CityBlock } from './CityBlock';
import { CityView } from './CityView';
import { UnlockedArea } from '../model/unlockedArea';
import { generateCityBlocks } from './generateCityBlocks';
import { sendMoveBuildingCommand } from '../elvenar/sendMoveBuildingCommand';

export function PopupMain() {
  const [cityEntities, setCityEntities] = React.useState([[], []] as [
    CityEntity[],
    UnlockedArea[]
  ]);
  const [blocks, setBlocks] = React.useState([] as CityBlock[]);
  const [unlockedAreas, setUnlockedAreas] = React.useState(
    [] as UnlockedArea[]
  );

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
        <Stack direction={'row'}>
          {/* <Button onClick={() => moveBuildingTest()}>Test Move Building</Button> */}
        </Stack>
        <Box>
          <CityView blocks={blocks} unlockedAreas={unlockedAreas} />
        </Box>
      </Stack>
    </Container>
  );
}

async function moveBuildingTest() {
  await sendMoveBuildingCommand(15419, 19, 35);
}

function generateUnlockedAreas(unlockedAreas: UnlockedArea[]): UnlockedArea[] {
  return unlockedAreas.map((r) => ({ ...r, x: r.x || 0, y: r.y || 0 }));
}

async function generateCity(
  setCityEntities: React.Dispatch<
    React.SetStateAction<[CityEntity[], UnlockedArea[]]>
  >
) {
  await sendBuildingsQuery();
  await sendInventoryQuery();
  await sendCityDataQuery();
  await sendRenderConfigQuery();

  const buildings = getBuildings();
  const goodsBuildings = getGoodsBuildings();
  const cityEntities = getCityEntities();
  const unlockedAreas = getUnlockedAreas();

  const buildingsDictionary = buildings.reduce((acc, building) => {
    acc[building.base_name] = acc[building.base_name] || [];
    acc[building.base_name].push(building);
    return acc;
  }, {} as Record<string, Building[]>);

  const goodsDictionary = goodsBuildings.reduce((acc, goods) => {
    const building_base_name = getBaseName(goods.id).baseName;
    acc[building_base_name] = acc[building_base_name] || [];
    acc[building_base_name].push(goods);
    return acc;
  }, {} as Record<string, GoodsBuilding[]>);

  const chapterRegex = /_Ch\d+/;

  const approxBuildings = buildings.reduce((acc, building) => {
    const baseName = building.base_name.replace(chapterRegex, '_Ch');
    acc[baseName] = acc[baseName] || [];
    acc[baseName].push(building);
    return acc;
  }, {} as Record<string, Building[]>);

  const q = cityEntities.map((entity) => {
    const { baseName, chapter } = getBaseName(entity.cityentity_id);
    const goodsBuilding = goodsDictionary[baseName]?.find((r) =>
      r.id.endsWith(`_${entity.level}`)
    );
    const stdBuilding = buildingsDictionary[baseName]?.find((r) => true);
    const approxBaseName = baseName.replace(chapterRegex, '_Ch');
    const approxBuilding = approxBuildings[approxBaseName];
    const length = goodsBuilding?.tile_length || stdBuilding?.length || 1;
    const width = goodsBuilding?.tile_width || stdBuilding?.width || 1;
    const description = stdBuilding?.description || '';
    const name = stdBuilding?.name || '';

    return { ...entity, length, width, description, name };
  });

  setCityEntities([q, unlockedAreas]);
}

interface bAndC {
  baseName: string;
  chapter?: number;
}

function getBaseName(goodsId: string): bAndC {
  const baseNameRex = /(.*?)(_\d+)?$/;
  const match = goodsId.match(baseNameRex);
  if (match) {
    const baseName = match[1];
    const chapter = match[2] ? parseInt(match[2].substring(1)) : undefined;
    return { baseName, chapter };
  } else {
    return { baseName: goodsId };
  }
}
