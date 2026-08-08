import React, { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Typography } from '@mui/material';

export interface SwitchableProductionViewModel {
  title: string;
  production?: string[];
  currentProductIndex: number;
}

export const SwitchableProduction = (props: { viewModels: SwitchableProductionViewModel[] }) => {
  const { viewModels } = props;
  const [collapsed, setCollapsed] = useState(true);

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
            Switchable Production
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {viewModels.length === 0 ? (
            <Typography
              variant='body2'
              sx={{
                color: 'text.secondary',
              }}
            >
              No switchable production buildings found.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {viewModels.map((item, index) => (
                <Box key={index}>
                  <Typography
                    variant='body2'
                    sx={{
                      fontWeight: 'bold',
                      mb: 0.75,
                    }}
                  >
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
                      <Typography
                        variant='caption'
                        sx={{
                          color: 'text.secondary',
                        }}
                      >
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
