import React, { useEffect, useMemo, useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NumbersIcon from '@mui/icons-material/Numbers';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCity } from './CityContext';

export const RuneShards = () => {
  const city = useCity();
  const [collapsed, setCollapsed] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('name');
  const [rawShards, setRawShards] = useState<
    {
      buildingName: string;
      amount: number;
    }[]
  >([]);

  useEffect(() => {
    async function Do() {
      await city.buildingFinder.ensureInitialized();
      const shards = Object.entries(city.resources)
        .filter(([k]) => k.startsWith('b_'))
        .map(([k, v]) => ({
          buildingName: city.buildingFinder?.getBuildingLowerCase(k.replace(/_shards$/, ''))?.sourceBuilding?.name || k,
          amount: v,
        }));

      setRawShards(shards);
    }
    void Do();
  }, [city.resources, city.buildingFinder]);

  // Dynamically sort the shards when the data or sort preference changes
  const sortedShards = useMemo(() => {
    return [...rawShards].sort((a, b) => {
      if (sortBy === 'name') {
        return a.buildingName.localeCompare(b.buildingName);
      } else {
        // Sort by amount descending. If amounts are equal, fall back to alphabetical
        if (b.amount === a.amount) {
          return a.buildingName.localeCompare(b.buildingName);
        }
        return b.amount - a.amount;
      }
    });
  }, [rawShards, sortBy]);

  const handleCopy = () => {
    const textToCopy = sortedShards
      .map(({ buildingName, amount }) => `${buildingName}: ${amount.toLocaleString()}`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy).catch((err) => {
      console.error('ElvenAssist: Unable to copy to clipboard', err);
    });
  };

  const handleSortChange = (event: React.MouseEvent<HTMLElement>, newSortBy: 'name' | 'amount' | null) => {
    if (newSortBy !== null) {
      setSortBy(newSortBy);
    }
  };

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
          <Typography
            sx={{
              fontWeight: 'bold',
            }}
          >
            Rune Shards
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {sortedShards.length === 0 ? (
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              No rune shards collected yet.
            </Typography>
          ) : (
            <>
              {/* Controls Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <ToggleButtonGroup
                  value={sortBy}
                  exclusive
                  onChange={handleSortChange}
                  size='small'
                  aria-label='sort order'
                >
                  <Tooltip title='Sort by Name'>
                    <ToggleButton value='name' aria-label='sort by name'>
                      <SortByAlphaIcon fontSize='small' sx={{ mr: 0.5 }} />
                      <Typography
                        variant='caption'
                        sx={{
                          fontWeight: 'bold',
                        }}
                      >
                        Name
                      </Typography>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title='Sort by Amount'>
                    <ToggleButton value='amount' aria-label='sort by amount'>
                      <NumbersIcon fontSize='small' sx={{ mr: 0.5 }} />
                      <Typography
                        variant='caption'
                        sx={{
                          fontWeight: 'bold',
                        }}
                      >
                        Amount
                      </Typography>
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>

                <Tooltip title='Copy list to clipboard'>
                  <IconButton onClick={handleCopy} size='small' color='primary'>
                    <ContentCopyIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Shards List */}
              {sortedShards.map(({ buildingName, amount }, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant='body2'>
                    {buildingName}: {amount.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
