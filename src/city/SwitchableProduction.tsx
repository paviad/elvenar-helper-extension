import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useCity } from './CityContext';
import { formatResourceName } from '../util/formatResourceName';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { State } from '../model/cityEntity';

interface SwitchableProductionViewModel {
  title: string;
  production?: string[];
  currentProductIndex: number;
}

const getCurrentProduct = (state: State | undefined): string => {
  if (!state?.current_product) {
    return '';
  }

  const rc = Object.keys(state.current_product.revenue.resources)[1];
  return rc;
};

export const SwitchableProduction = () => {
  const city = useCity();
  const [collapsed, setCollapsed] = useState(true);
  const [viewModels, setViewModels] = useState<SwitchableProductionViewModel[]>([]);

  useEffect(() => {
    async function Do() {
      const buildings = Object.values(city.blocks)
        .map((r) => ({ building: city.buildingFinder.getBuildingExact(r.gameId), state: r.entity.state }))
        .filter((r) => !!r.building)
        .map((r) => ({
          building: r.building!,
          currentProduct: getCurrentProduct(r.state),
        }));

      const switchableProductionBuildings = buildings.filter((b) => b.building.sourceBuilding.production?.isSwitchable);

      const goodsNames = await getGoodsNames();
      const boostedGoods = city.boostedGoods;

      const viewModel = switchableProductionBuildings
        .map((b) => ({
          name: b.building.name,
          currentProduct: b.currentProduct,
          production: b.building.sourceBuilding
            .production!.products.map((p) => Object.keys(p.revenue.resources))
            .flatMap((x) => x),
        }))
        .map((b) => ({
          id: JSON.stringify({ name: b.name, production: b.production, currentProduct: b.currentProduct }),
          count: 1,
          display: '',
          name: b.name,
          production: b.production.map((x) => formatResourceName(goodsNames, boostedGoods, x)),
          currentProductIndex: b.production.indexOf(b.currentProduct),
        }))
        .reduce(
          (acc, b) => {
            const existing = acc.find((x) => x.id === b.id);
            if (existing) {
              existing.production = Array.from(new Set([...(existing.production || []), ...(b.production || [])]));
              existing.count += 1;
              existing.display = `${existing.name} (${existing.count})`;
              existing.currentProductIndex = b.currentProductIndex;
            } else {
              b.display = `${b.name} (${b.count})`;
              acc.push(b);
            }
            return acc;
          },
          [] as {
            id: string;
            name: string;
            production?: string[];
            count: number;
            display: string;
            currentProductIndex: number;
          }[],
        )
        .map(
          (b) =>
            ({
              title: b.display,
              production: b.production,
              currentProductIndex: b.currentProductIndex,
            }) satisfies SwitchableProductionViewModel,
        );

      setViewModels(viewModel);
    }

    void Do();
  }, [city.blocks, city.buildingFinder, city.boostedGoods]);

  return (
    <Box>
      <Accordion
        expanded={!collapsed}
        onChange={(_, expanded) => setCollapsed(!expanded)}
        elevation={3}
        disableGutters
        sx={{ borderRadius: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='legend-content' id='legend-header'>
          <Typography fontWeight='bold'>Switchable Production</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {viewModels.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No switchable production buildings found.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {viewModels.map((item, index) => (
                <Box key={index}>
                  <Typography variant='body2' fontWeight='bold' sx={{ mb: 0.75 }}>
                    {item.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {item.production && item.production.length > 0 ? (
                      item.production.map((prod, pIndex) => (
                        <Chip
                          key={pIndex}
                          label={prod}
                          size='small'
                          variant={pIndex === item.currentProductIndex ? 'filled' : 'outlined'}
                          color={pIndex === item.currentProductIndex ? 'primary' : 'default'}
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            fontWeight: pIndex === item.currentProductIndex ? 'bold' : 'normal',
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant='caption' color='text.secondary'>
                        Unknown production
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
