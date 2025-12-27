import React from 'react';
import { CityViewState } from './CityViewState';

// Sync blocks with props
export const setBlocksEffect = (s: CityViewState) =>
  React.useEffect(() => {
    const [_, setBlocks] = s.rBlocks;
    setBlocks(s.props.blocks);
  }, [s.props.blocks]);
