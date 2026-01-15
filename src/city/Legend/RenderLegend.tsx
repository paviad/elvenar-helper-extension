import React from 'react';
import { getTypeColor } from './getTypeColor';
import { colorDescriptions } from './colorDescriptions';
import { useCity } from '../CityContext';
import { Stack } from '@mui/material';

export function RenderLegend() {
  const s = useCity();
  const { allTypes } = s;
  return (
    <Stack>
      <div style={{ width: 300, marginLeft: 16 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Color Legend</div>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
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
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Unknown Type Legend</div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
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
                      }}
                    />
                    <span>{type}</span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}
      </div>
    </Stack>
  );
}
