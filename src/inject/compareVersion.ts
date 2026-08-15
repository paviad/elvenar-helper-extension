export const compareVersion = (vRight: string, vLeft?: string): number => {
  vLeft = vLeft || window.gameVars.version;
  const vLeftParts = vLeft.split('.').map(Number);
  const vRightParts = vRight.split('.').map(Number);
  for (let i = 0; i < Math.max(vLeftParts.length, vRightParts.length); i++) {
    const vLeftPart = vLeftParts[i] || 0;
    const vRightPart = vRightParts[i] || 0;
    if (vLeftPart > vRightPart) return 1;
    if (vLeftPart < vRightPart) return -1;
  }
  return 0;
};
