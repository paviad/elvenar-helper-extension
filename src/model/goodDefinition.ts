/** A good or resource as the game's goods file has it. */
export interface GoodDefinition {
  id: string;
  name: string;
  /** The tier, 1 to 3, on goods only. */
  quality?: number;
  /** Which of the three goods of a tier it is, 1 to 3: marble, steel and planks are chains 1, 2 and 3. */
  chain?: number;
  /** The set it belongs to - common, sentient, ascended - on goods only. */
  type?: string;
}
