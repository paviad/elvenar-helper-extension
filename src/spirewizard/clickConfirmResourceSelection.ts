export const clickConfirmResourceSelection = async () => {
  const navContainer = document.querySelector('div.spire-nav.container');
  if (navContainer) {
    const firstButton = navContainer.querySelector('button');
    if (firstButton) {
      (firstButton as HTMLButtonElement).click();
    } else {
      console.warn('No button found in spire-nav container.');
    }
  } else {
    console.warn('No spire-nav container found.');
  }
};
