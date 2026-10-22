/**
 * Whether neighbourly help can reach a building of this size. A building only one tile wide or
 * deep, in either direction, cannot be helped.
 */
export const canReceiveNeighbourlyHelp = (size: { width: number; length: number }) => size.width > 1 && size.length > 1;
