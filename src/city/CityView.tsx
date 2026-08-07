import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { getAccountById } from '../elvenar/AccountManager';
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
import { TranscendenceStatus, TranscendenceViewModel } from './TranscendenceStatus';
import { useSettledValue } from './useSettledValue';
import { WorkingState } from './WorkingState';

/** Stable empty defaults, so a city with nothing to show does not hand out fresh arrays. */
const NO_TRANSCENDENCE: TranscendenceViewModel[] = [];
const NO_SWITCHABLE_PRODUCTION: SwitchableProductionViewModel[] = [];

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

  // Both panels below are a function of which buildings exist, not where they sit, so they
  // read the settled layout rather than recomputing on every frame of a drag - the same
  // reason the context's own whole-city figures do. It replaces the dragIndex guard these
  // two used to carry, which froze them mid-drag by leaving stale state in place.
  const settledBlocks = useSettledValue(city.blocks, city.dragIndex === null);

  const transcendenceViewModels = useMemo(() => {
    if (!city.accountId) {
      return NO_TRANSCENDENCE;
    }

    // Account data is only replaced when the city is switched or reloaded, and a reload
    // bumps forceUpdate, so those two cover every change to what this reads.
    const transcendenceData = getAccountById(city.accountId)?.transcendenceData;

    if (!transcendenceData) {
      return NO_TRANSCENDENCE;
    }

    const byEntityId = Object.values(settledBlocks).reduce(
      (acc, block) => {
        acc[block.entity.id] = block;
        return acc;
      },
      {} as Record<string, (typeof settledBlocks)[number]>,
    );

    return transcendenceData
      .map((t) => {
        const block = byEntityId[t.buildingId];
        return {
          building: block?.gameId ? city.buildingFinder.getBuildingExact(block?.gameId) : undefined,
          transcendence: t,
        };
      })
      .filter((b) => !!b.building)
      .map(
        (b) =>
          ({
            buildingName: b.building!.name,
            volatile_sigils_cost: b.transcendence.costs.resources.volatile_sigils,
            purchasableTime: b.transcendence.purchasableTime,
            state: b.transcendence.state,
            stageToUnlock: b.transcendence.stageToUnlock,
            endTime: b.transcendence.endTime,
          }) satisfies TranscendenceViewModel,
      );
    // forceUpdate is not referenced in the body: getAccountById reads a module-level store,
    // which the lint rule cannot see, so the bump is the only signal that it has moved on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledBlocks, city.buildingFinder, city.accountId, city.forceUpdate]);

  const switchableProductionViewModels = useMemo(() => {
    // The goods names come from the context, which already loads them once for the whole
    // city. Awaiting getGoodsNames() here was the only asynchronous step in this
    // derivation, and the sole reason it had to be an effect at all.
    const goodsNames = city.goodsNames;
    const boostedGoods = city.boostedGoods;

    const buildings = Object.values(settledBlocks)
      .map((r) => ({ building: city.buildingFinder.getBuildingExact(r.gameId), state: r.entity.state }))
      .filter((r) => !!r.building)
      .map((r) => ({
        building: r.building!,
        currentProduct: getCurrentProduct(r.state),
      }));

    const switchableProductionBuildings = buildings.filter((b) => b.building.sourceBuilding.production?.isSwitchable);

    if (switchableProductionBuildings.length === 0) {
      return NO_SWITCHABLE_PRODUCTION;
    }

    return switchableProductionBuildings
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
  }, [settledBlocks, city.buildingFinder, city.boostedGoods, city.goodsNames]);

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

        {switchableProductionViewModels.length > 0 && (
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
            <SwitchableProduction viewModels={switchableProductionViewModels} />
          </Box>
        )}

        {transcendenceViewModels.length > 0 && (
          /* Transcendence Status */
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
            <TranscendenceStatus transcendenceData={transcendenceViewModels} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
