import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { formatTimeLeft } from '../util/formatTimeLeft';

export interface TranscendenceViewModel {
  buildingName: string; // Title of the building, e.g. "Sawmill"
  volatile_sigils_cost: number; // Cost in volatile sigils to activate or extend the transcendence
  purchasableTime: number; // Amount of time in seconds that can be purchased for the above cost of sigils
  state: string; // "active" or "inactive"
  stageToUnlock: number; // Disregard for now
  endTime: number; // Timestamp in milliseconds for when transcendence expires
}

export interface TranscendenceProps {
  transcendenceData: TranscendenceViewModel[];
}

// Compact extension time (e.g., "+11d" or "+24h")
const formatPurchasableTime = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours >= 24 && hours % 24 === 0) {
    return `+${hours / 24}d`;
  }
  return `+${hours}h`;
};

export const TranscendenceStatus = (props: TranscendenceProps) => {
  const { transcendenceData } = props;
  const [collapsed, setCollapsed] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Refresh the component every minute to update the "time left" counters automatically
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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
          <Typography fontWeight='bold'>Transcendence Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {transcendenceData.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No transcendence data available.
            </Typography>
          ) : (
            <Stack spacing={2} divider={<Divider flexItem />}>
              {transcendenceData.map((item, index) => {
                const isActive = item.state === 'active';
                const expiryDate = new Date(item.endTime);
                const isExpired = Date.now() >= item.endTime;

                return (
                  <Box key={`${item.buildingName}-${index}`}>
                    <Box display='flex' justifyContent='space-between' alignItems='center' mb={0.5}>
                      <Typography variant='subtitle1' fontWeight='bold' noWrap>
                        {item.buildingName}
                      </Typography>
                      <Chip
                        label={isActive && !isExpired ? 'Active' : 'Inactive'}
                        color={isActive && !isExpired ? 'success' : 'default'}
                        size='small'
                        variant={isActive && !isExpired ? 'filled' : 'outlined'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>

                    <Stack spacing={0.5}>
                      {/* Flex layout splits the date and the relative time to opposite edges */}
                      {(!isExpired || isActive) && (
                        <Box display='flex' justifyContent='space-between' alignItems='center'>
                          <Typography variant='body2' color='text.secondary' noWrap>
                            <strong>Ends:</strong>{' '}
                            {expiryDate.toLocaleString(navigator.languages, { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                          <Typography
                            variant='body2'
                            color={isExpired ? 'error' : 'primary'}
                            fontWeight='medium'
                            sx={{ ml: 1 }}
                          >
                            {formatTimeLeft(item.endTime, now)}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant='body2' color='text.secondary'>
                        <strong>Extend:</strong> {item.volatile_sigils_cost} Volatile Sigils (
                        {formatPurchasableTime(item.purchasableTime)})
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
