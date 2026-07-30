import React from 'react';
import { CityPlanner } from './topics/CityPlanner';
import { FellowshipAdventure } from './topics/FellowshipAdventure';
import { InGameAssistant } from './topics/InGameAssistant';
import { Introduction } from './topics/Introduction';
import { InventoryManager } from './topics/InventoryManager';
import { SpireWizardIntegration } from './topics/SpireWizardIntegration';
import { UpgradeFinder } from './topics/UpgradeFinder';

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
    id: 'in-game-assistant',
    title: 'In-Game Assistant',
    content: <InGameAssistant />,
  },
  {
    id: 'city-planner',
    title: 'City Planner',
    content: <CityPlanner />,
  },
  {
    id: 'upgrade-finder',
    title: 'Upgrade Finder',
    content: <UpgradeFinder />,
    isNew: true,
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
  },
];
