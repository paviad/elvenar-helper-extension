import React from 'react';
import { Box, Container, Stack } from '@mui/material';
import { CityView } from './CityView';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';

export function CityMain() {
  return (
    <>
      {/* <UnsavedChangesGuard isDirty={true} /> */}
      <Container maxWidth={false} sx={{ maxWidth: 'none' }}>
        <Stack>
          <Stack direction={'row'}>
            {/* <Button onClick={() => moveBuildingTest()}>Test Move Building</Button> */}
          </Stack>
          <Box>
            <CityView />
          </Box>
        </Stack>
      </Container>
    </>
  );
}
