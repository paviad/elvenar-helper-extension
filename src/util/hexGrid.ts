export const oddq_to_axial = (hex: { col: number; row: number }) => {
  const parity = hex.col & 1;
  const q = hex.col;
  const r = hex.row - (hex.col - parity) / 2;
  return { col: q, row: r };
};

export const axial_distance = (a: { col: number; row: number }, b: { col: number; row: number }) => {
  const dq = a.col - b.col;
  const dr = a.row - b.row;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
};

export const offset_distance = (a: { col: number; row: number }, b: { col: number; row: number }) => {
  const ac = oddq_to_axial(a);
  const bc = oddq_to_axial(b);
  return axial_distance(ac, bc);
};

export const oddq_offset_to_pixel = (hex: { col: number; row: number }) => {
  // hex to cartesian
  const x = (3 / 2) * hex.col;
  const y = Math.sqrt(3) * (hex.row + 0.5 * (hex.col & 1));
  // scale cartesian coordinates
  return { x, y };
};

export const angle_from_origin = (origin: { col: number; row: number }, hex: { col: number; row: number }) => {
  const pixel = oddq_offset_to_pixel(hex);
  const originPixel = oddq_offset_to_pixel(origin);
  const dx = pixel.x - originPixel.x;
  const dy = pixel.y - originPixel.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 180; // Invert dy and dx to get angle from origin to hex
  return angle;
};
