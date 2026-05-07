import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { State } from '../model/cityEntity';
import { formatResourceName } from '../util/formatResourceName';
import { CityProvider, useCity } from './CityContext';
import { RenderCityGrid } from './CityGrid/RenderCityGrid';
import { CityResourceSummary } from './CityResourceSummary';
import { CitySettings } from './CitySettings';
import { RenderLegend } from './Legend/RenderLegend';
import { RenderMoveLog } from './MoveLog/RenderMoveLog';
import { RuneShards } from './RuneShards';
import { SwitchableProduction, SwitchableProductionViewModel } from './SwitchableProduction';
import { WorkingState } from './WorkingState';

export function CityView() {
  return (
    <CityProvider>
      <CityViewInner />
    </CityProvider>
  );
}

const getCurrentProduct = (state: State | undefined): string => {
  if (!state?.current_product) {
    return '';
  }

  const rc = Object.keys(state.current_product.revenue.resources)[1];
  return rc;
};

function CityViewInner() {
  const city = useCity();
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
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* Left Column: Settings & Move Log */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' }, // Hide on screens smaller than 1200px
          flexDirection: 'column',
          mr: 2,
          position: 'sticky',
          top: 0,
          maxHeight: '100vh',
        }}
      >
        <CitySettings />
        <RenderMoveLog />
      </Box>

      {/* Center / Grid - Flex grow to fill space */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <RenderCityGrid />
      </Box>

      {/* Right Sidebar - Legend + Resource Summary */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' }, // Hide on screens smaller than 1200px
          flexDirection: 'column',
          width: 320,
          minWidth: 320,
          borderLeft: 1,
          borderColor: 'divider',
          bgcolor: 'grey.100', // Replaces #f5f5f5
          // Sticky positioning to keep sidebar in view while page scrolls
          position: 'sticky',
          top: 0,
          height: '100vh', // Ensure sidebar spans viewport height for internal scrolling if needed
        }}
      >
        {/* Legend - Scrollable Area */}
        <Box
          sx={{
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.100',
            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            zIndex: 1,
          }}
        >
          <RenderLegend />
        </Box>

        {/* Working State */}
        <Box
          sx={{
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.100',
            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            zIndex: 1,
          }}
        >
          <WorkingState />
        </Box>

        {/* Resource Summary - Fixed/Sticky at Bottom */}
        <Box
          sx={{
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.100',
            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            zIndex: 1,
          }}
        >
          <CityResourceSummary />
        </Box>

        {/* Rune Shards */}
        <Box
          sx={{
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.100',
            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            zIndex: 1,
          }}
        >
          <RuneShards />
        </Box>

        {viewModels.length > 0 && (
          /* Switchable Production */
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
              zIndex: 1,
            }}
          >
            <SwitchableProduction viewModels={viewModels} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
