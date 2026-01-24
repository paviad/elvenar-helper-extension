import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import React from 'react';
import { useTabStore } from '../../util/tabStore';
import { useCity } from '../CityContext';
import { colorDescriptions } from './colorDescriptions';
import { getTypeColor } from './getTypeColor';

export function RenderLegend() {
  const s = useCity();
  const { allTypes } = s;
  const legendCollapsed = useTabStore((state) => state.legendCollapsed);
  const setLegendCollapsed = useTabStore((state) => state.setLegendCollapsed);

  return (
    <Box>
      <Accordion
        expanded={!legendCollapsed}
        onChange={(_, expanded) => setLegendCollapsed(!expanded)}
        elevation={3}
        disableGutters
        sx={{ borderRadius: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls='legend-content' id='legend-header'>
          <Typography fontWeight='bold'>Color Legend</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, margin: 0 }}>
            {Object.entries(colorDescriptions).map(([color, desc]) => (
              <li
                key={color}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    background: color,
                    border: '1px solid #888',
                    borderRadius: 4,
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                />
                <span>{desc}</span>
              </li>
            ))}
          </ul>

          {(() => {
            const unknownTypes = allTypes.filter(
              (type) => !Object.keys(colorDescriptions).includes(getTypeColor(type, allTypes, false)),
            );
            if (unknownTypes.length === 0) return null;
            return (
              <>
                <Box sx={{ mt: 2, mb: 1, fontWeight: 'bold', fontSize: 14 }}>Unknown Types</Box>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, margin: 0 }}>
                  {unknownTypes.map((type) => (
                    <li
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 18,
                          height: 18,
                          background: getTypeColor(type, allTypes, false),
                          border: '1px solid #888',
                          borderRadius: 4,
                          marginRight: 8,
                          flexShrink: 0,
                        }}
                      />
                      <span>{type}</span>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
