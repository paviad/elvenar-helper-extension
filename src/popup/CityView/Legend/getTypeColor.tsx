import { knownTypes } from './knownTypes';
import { TYPE_COLORS } from './TYPE_COLORS';

export function getTypeColor(
  type: string,
  allTypes: string[],
  moved?: boolean
): string {
  let color: string;
  if (knownTypes[type]) {
    // Ensure color starts with #
    const knownColor = knownTypes[type];
    color = knownColor.startsWith('#') ? knownColor : `#${knownColor}`;
  } else {
    const idx = allTypes.indexOf(type);
    color = TYPE_COLORS[idx % TYPE_COLORS.length] || '#000';
  }
  if (moved) {
    // Dim color for moved blocks
    color = color + 'AA'; // Add alpha for transparency
  }
  return color;
}
