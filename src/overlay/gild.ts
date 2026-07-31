import type { CSSProperties } from 'react';

// Shared "gilded plaque" styling for the overlay's message surfaces — thread posts and chat.
// Elvenar's own UI is carved and gilt, so a metal band around a bevelled card face reads as
// native there, and it gives otherwise-flat message lists a tactile edge.
//
// Everything here is a plain object meant to be *spread* into an `sx` prop
// (`sx={{ ...plaqueBand, flex: 1 }}`) so callers can add layout on top.

export const gild = {
  light: '#f7e6b4', // lit edge of the metal band (top-left)
  mid: '#c9a227', // body of the gold
  deep: '#8a6a1c', // shaded edge (bottom-right)
  cardTop: '#fffdf6',
  cardBottom: '#f6efdd',
  ink: '#3b3427', // warm near-black for message text
  bronze: '#6b5220', // author names, links
  bronzeSoft: '#8d7a4e', // timestamps, secondary marks
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  parchment: 'radial-gradient(120% 90% at 50% 0%, #f8f2e4 0%, #ece3cf 100%)',
} as const;

// A plaque is two layers: this outer band painted as metal, wrapping a face (below) that is
// lit from the top so it sits proud of the parchment.
export const plaqueBand = {
  position: 'relative',
  p: '2px',
  borderRadius: '7px',
  background: `linear-gradient(150deg, ${gild.light} 0%, ${gild.mid} 40%, ${gild.deep} 72%, ${gild.light} 100%)`,
  boxShadow: '0 1px 3px rgba(58, 46, 20, 0.3), 0 0 0 1px rgba(120, 92, 24, 0.25)',
} as const;

// Tail pointing back at the sender's avatar. Sits behind the face, so only its outer half shows.
export const plaqueTail = {
  position: 'absolute',
  left: -5,
  top: 11,
  width: 10,
  height: 10,
  transform: 'rotate(45deg)',
  background: `linear-gradient(135deg, ${gild.light}, ${gild.mid})`,
  borderRadius: '2px',
} as const;

export const defaultFace = `linear-gradient(180deg, ${gild.cardTop} 0%, ${gild.cardBottom} 100%)`;

// `extraInset` prepends an inset shadow — used to stripe a face for state (e.g. unread).
export const plaqueFace = (face: string = defaultFace, extraInset?: string) => ({
  position: 'relative' as const,
  borderRadius: '5px',
  px: 1.25,
  py: 0.9,
  background: face,
  boxShadow: `${extraInset ? `${extraInset}, ` : ''}inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(122, 94, 28, 0.2)`,
});

// A cut gold line with a lit edge under it, fading out to the right.
export const engravedRule = {
  height: '1px',
  mt: 0.5,
  mb: 0.75,
  background: `linear-gradient(90deg, ${gild.mid} 0%, rgba(201, 162, 39, 0.25) 55%, rgba(201, 162, 39, 0) 100%)`,
  boxShadow: '0 1px 0 rgba(255, 255, 255, 0.85)',
} as const;

// Same cut line, but tapering at both ends — for separators that span a full row.
export const engravedRuleFull = {
  height: '1px',
  background: `linear-gradient(90deg, rgba(201, 162, 39, 0) 0%, ${gild.mid} 18%, ${gild.mid} 82%, rgba(201, 162, 39, 0) 100%)`,
  boxShadow: '0 1px 0 rgba(255, 255, 255, 0.85)',
} as const;

export const gildedAvatar = {
  width: 34,
  height: 34,
  fontFamily: gild.serif,
  fontWeight: 700,
  fontSize: 15,
  color: gild.bronze,
  background: 'linear-gradient(160deg, #fdf6e3 0%, #e9d9ab 100%)',
  border: `1px solid ${gild.mid}`,
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 2px rgba(58, 46, 20, 0.3)',
} as const;

export const authorType = {
  fontFamily: gild.serif,
  fontWeight: 700,
  fontSize: 14,
  color: gild.bronze,
  letterSpacing: '0.01em',
} as const;

export const timestampType = {
  color: gild.bronzeSoft,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  fontVariantNumeric: 'tabular-nums',
} as const;

export const bodyType = {
  color: gild.ink,
  fontSize: 14,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  textAlign: 'left',
} as const;

// Header/footer chrome that brackets a gilded surface.
export const gildedBar = {
  background: 'linear-gradient(180deg, #fffdf6, #f3ead6)',
  borderBottom: `2px solid ${gild.mid}`,
  boxShadow: `inset 0 -1px 0 ${gild.light}`,
} as const;

export const goldLink: CSSProperties = {
  color: gild.bronze,
  fontSize: 13,
  textDecoration: 'underline',
  cursor: 'pointer',
};
