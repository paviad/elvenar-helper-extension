import { sendRefreshCityMessage } from '../../chrome/messages';
import { loadAccountManagerFromStorage } from '../../elvenar/AccountManager';
import { useTabStore } from '../../util/tabStore';

export async function refreshCity(accountId: string | undefined, triggerForceUpdate: () => void) {
  const setGlobalError = useTabStore.getState().setGlobalError;

  if (!accountId) {
    console.warn('No accountId set in CityViewState, cannot refresh city');
    return;
  }
  const response = await sendRefreshCityMessage(accountId);
  if (!response.success) {
    console.error('Failed to refresh city:', response.message);
    setGlobalError('Failed to refresh city, please refresh your Elvenar tab and try again.');
    return;
  }
  setGlobalError(undefined);
  await loadAccountManagerFromStorage(true);
  triggerForceUpdate();
  // window.location.reload();
}
