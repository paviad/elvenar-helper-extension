/**
 * The Vestige of Eternity, held by the game's own id rather than its display name. The name is
 * whatever the player's language calls it, so matching on it only ever worked on an English
 * client — everywhere else the building quietly failed to be recognised.
 *
 * It is singled out in two unrelated places, which is why this sits on its own: it stands
 * outside the city grid by design, and it is levelled by a mechanism of its own at every level
 * rather than by donated knowledge, so a KP swap thread has nothing to give it.
 */
export const VESTIGE_OF_ETERNITY = 'B_All_Spire_AW';

/**
 * Entity and block ids carry a level suffix — `B_All_Spire_AW_9` — which the catalog's base
 * names do not, so this takes either.
 */
export function isVestigeOfEternity(gameId: string | undefined): boolean {
  return !!gameId && gameId.replace(/_\d+$/, '') === VESTIGE_OF_ETERNITY;
}
