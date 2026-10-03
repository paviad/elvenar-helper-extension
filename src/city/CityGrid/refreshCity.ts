import { sendRefreshCityMessage } from '../../chrome/messages';
import { loadAllAccounts } from '../../elvenar/accountStore';
import { useTabStore } from '../../util/tabStore';
import { CityContextType } from '../CityContext';
import { deleteCityById } from '../savedCities';

export async function refreshCity(city: CityContextType) {
  const { accountId, triggerForceUpdate } = city;
  const setGlobalError = useTabStore.getState().setGlobalError;

  if (!accountId) {
    console.warn('ElvenAssist: No accountId set in CityViewState, cannot refresh city');
    return;
  }
  await deleteCityById(`${accountId} (autosave)`);
  const response = await sendRefreshCityMessage(accountId);
  if (!response.success) {
    console.error('ElvenAssist: Failed to refresh city:', response.message);
    setGlobalError('Failed to refresh city, please refresh your Elvenar tab and try again.');
    return;
  }
  setGlobalError(undefined);
  await loadAllAccounts();
  city.setSearchTerm(''); // Re-apply search term
  city.setMoveLog((_) => []); // Clear move log to prevent stale data issues
  city.setRedoStack((_) => []); // Clear redo stack as well
  city.setReplacedArea(null); // The marked footprint belongs to the layout being replaced
  triggerForceUpdate();
  // window.location.reload();
}
