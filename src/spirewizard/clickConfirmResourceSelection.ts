export const clickConfirmResourceSelection = () => {
  const navContainer = document.querySelector('div.spire-nav.container');
  if (navContainer) {
    const firstButton = navContainer.querySelector('button');
    if (firstButton) {
      firstButton.click();
    } else {
      console.warn('ElvenAssist: No button found in spire-nav container.');
    }
  } else {
    console.warn('ElvenAssist: No spire-nav container found.');
  }
};
