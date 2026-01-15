export const getPrefix = (id: string, type: string) => {
  const c = id[0];
  if (id.startsWith('B_')) {
    const match = id.match(/^(B_.*)_\d+/);
    if (match) {
      return match[1];
    }
    return '@';
  }
  if (type.includes('premium')) return `X${c}`;
  if (c === 'M') return `M${id[2]}`;
  return c;
};
