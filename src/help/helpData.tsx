import React from 'react';
import { Introduction } from './topics/Introduction';
import { CityPlanner } from './topics/CityPlanner';
import { InventoryManager } from './topics/InventoryManager';
import { FellowshipAdventure } from './topics/FellowshipAdventure';
import { SpireWizardIntegration } from './topics/SpireWizardIntegration';

export interface HelpSection {
  id: string;
  title: string;
  content: React.ReactNode;
  isNew?: boolean;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    content: <Introduction />,
  },
  {
    id: 'city-planner',
    title: 'City Planner',
    content: <CityPlanner />,
  },
  {
    id: 'inventory',
    title: 'Inventory Manager',
    content: <InventoryManager />,
  },
  {
    id: 'fa-tracker',
    title: 'Fellowship Adventure',
    content: <FellowshipAdventure />,
  },
  {
    id: 'spire-wizard',
    title: 'Spire Wizard',
    content: <SpireWizardIntegration />,
    isNew: true,
  },
];
