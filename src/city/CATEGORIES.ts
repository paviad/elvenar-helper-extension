export type BuildingCategory = 'Basics' | 'Military' | 'Goods' | 'Culture' | 'Settlements' | 'Wonders' | 'Other';

// --- Constants ---
export const CATEGORIES: BuildingCategory[] = [
  'Basics',
  'Military',
  'Goods',
  'Culture',
  'Settlements',
  'Wonders',
  'Other',
];

export type BuildingField = 'Level' | 'Chapter' | 'Stage';

export interface BuildingDefinition {
  id: string;
  name: string;
  type: string;
  chapter?: number;
  category: BuildingCategory;
  width: number;
  length: number;
  iconUrl?: string; // Optional image URL
  supportedFields?: BuildingField[];
  maxLevel?: number;
  // Optional function to determine size based on level
  getSizeAtLevel?: (level: number) => { width: number; length: number };
}
