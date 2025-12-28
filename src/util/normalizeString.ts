export function normalizeString(str: string) {
  // 1. Convert to lowercase
  const lowercased = str.toLowerCase();
  
  // 2. Normalize to NFD form to separate base characters and diacritics
  const normalized = lowercased.normalize('NFD');
  
  // 3. Remove diacritics using a Unicode property escape (recommended for modern JS)
  // The 'gu' flags mean global (g) and unicode (u).
  const withoutDiacritics = normalized.replace(/\p{Diacritic}/gu, '');
  
  // For older environments without Unicode property escapes, use this regex:
  // const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '');

  return withoutDiacritics;
}
