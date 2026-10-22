import { CultureHelpState } from '../model/cultureBonus';

interface Effect {
  actionId: string;
  ownerId: string;
}

/**
 * Which buildings are helped for culture and which carry an Ensorcelled Endowment right now.
 * The city's startup data does not say how big its buildings are, and help cannot reach the
 * thin ones, so the shares are left to the editor, which knows the sizes.
 */
export function extractCultureHelpState(effects: Effect[]): CultureHelpState {
  const ownersOf = (actionId: string) => [
    ...new Set(effects.filter((e) => e.actionId === actionId).map((e) => e.ownerId)),
  ];
  return { helped: ownersOf('time_limited_help'), enchanted: ownersOf('neighbourly_help_boost_spell') };
}
