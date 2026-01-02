import { createReactUi } from './city/createReactUi';
import { loadAccountManagerFromStorage } from './elvenar/AccountManager';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccountManagerFromStorage();
  createReactUi();
});
