// Utility to determine contrast color
export function getContrastColor(hex: string) {
  // Remove # if present
  hex = hex.replace('#', '');
  // Parse r, g, b
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return white for dark backgrounds, black for light
  return luminance < 0.35 ? '#ffffff' : '#000000';
}
