import { ProvinceStatus } from './deriveWorldMap';
import { ProvinceGood } from './worldMapGeometry';

/** One colour per good, close to how the game paints it. */
export const GOOD_COLOURS: Record<ProvinceGood, string> = {
  marble: '#90a7ad',
  steel: '#556c7a',
  planks: '#a3774e',
  crystal: '#2bb4f7',
  scrolls: '#d6a62f',
  silk: '#b96acb',
  elixir: '#40a245',
  magic_dust: '#ef4279',
  gems: '#5f68c2',
};

const FALLBACK_GOOD_NAMES: Record<ProvinceGood, string> = {
  marble: 'Marble',
  steel: 'Steel',
  planks: 'Planks',
  crystal: 'Crystal',
  scrolls: 'Scrolls',
  silk: 'Silk',
  elixir: 'Elixir',
  magic_dust: 'Magic Dust',
  gems: 'Gems',
};

/** The good's name as the game gives it, once the game has; in English until then. */
export const goodName = (goodsNames: Record<string, string>, good: ProvinceGood) =>
  goodsNames[good] || FALLBACK_GOOD_NAMES[good];

export const DIFFICULTY_LABELS = ['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'];

/** How a hex of each state is drawn, given its good's colour. */
export const hexStyle = (status: ProvinceStatus, colour: string) => {
  switch (status) {
    case 'completed':
      return { fill: colour, fillOpacity: 1, stroke: '#fff', strokeWidth: 1 };
    case 'incomplete':
      return { fill: colour, fillOpacity: 0.4, stroke: colour, strokeWidth: 2 };
    case 'scouting':
      return { fill: '#fff', fillOpacity: 1, stroke: colour, strokeWidth: 2.5, strokeDasharray: '6 3' };
    case 'scoutable':
      return { fill: '#fff', fillOpacity: 1, stroke: colour, strokeWidth: 2.5 };
    case 'locked':
      return { fill: '#e3e7e8', fillOpacity: 1, stroke: colour, strokeWidth: 1, strokeOpacity: 0.65 };
  }
};

/** A length of time in seconds, in its two largest units. */
export const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
