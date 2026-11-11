import { useEffect, useState } from 'react';
import { listenForGenericResponse } from '../../chrome/messages';
import { getAccountById, loadAccount } from '../../elvenar/accountStore';
import { clearFindInGame, FindInGame, findInGameKey, getFindInGame, parseFindInGame } from '../../worldmap/findInGame';
import { goodAt, Hex } from '../../worldmap/worldMapGeometry';
import { goodName } from '../../worldmap/worldMapStyle';
import { setOverlayNotice } from '../overlayNotices';
import { getAccountId } from '../overlayStore';
import { removeProvinceMark, showProvinceMark } from './worldMapMarks';
import { MapViewStatus, worldMapTracker } from './worldMapTracker';

const NOTICE = 'worldMapFind';

const DETAILS: Record<MapViewStatus, string> = {
  showing: 'Outlined on the world map, or pointed to from its edge.',
  hidden: 'Shown when the game is back on the world map where you left it.',
  unknown: 'Open the world map to see it. If it is open already, leave it and open it again.',
};

/**
 * Shows the province asked for on the World Map page on the game's own world map. The map's view
 * is followed from the start, as it is only known from the moment the map opens; the picture is
 * looked at, and the city's home read, only while a province is being looked for.
 */
export const useWorldMapFinder = () => {
  const [target, setTarget] = useState<FindInGame>();
  const [home, setHome] = useState<Hex>();

  // The view is followed whether or not anything is being looked for.
  useEffect(() => {
    worldMapTracker.start();
    return listenForGenericResponse('R:WorldMapService/fetchInitialWorldMapData', () => worldMapTracker.opened());
  }, []);

  // The request, as the World Map page leaves it in storage.
  useEffect(() => {
    const accountId = getAccountId();
    if (!accountId) return;
    const key = findInGameKey(accountId);
    let live = true;
    void getFindInGame(accountId).then((found) => live && setTarget(found));
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) {
        setTarget(parseFindInGame(changes[key].newValue as string | undefined, Date.now()));
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const looking = target !== undefined;

  // Where the city is, which the stored map knows. Read once a province is asked for.
  useEffect(() => {
    const accountId = getAccountId();
    if (!looking || home || !accountId) return;
    let live = true;
    void loadAccount(accountId).then(() => {
      if (live) setHome(getAccountById(accountId)?.worldMap?.home);
    });
    return () => {
      live = false;
    };
  }, [looking, home]);

  useEffect(() => {
    const accountId = getAccountId();
    if (!target || !accountId) return;
    const stop = () => void clearFindInGame(accountId);
    const title = `World map: showing a ${goodName({}, goodAt(target.r, target.q))} province`;

    const unsubscribe = worldMapTracker.subscribe((pan, status) => {
      showProvinceMark(target, home, pan);
      setOverlayNotice(NOTICE, { title, detail: `${DETAILS[status]} Click here to stop.`, onClick: stop });
    });
    // Opening the province is finding it.
    const unlisten = listenForGenericResponse<Partial<Hex> | undefined>(
      'R:WorldMapService/getProvinceInformation',
      (msg) => {
        if (msg.payload?.r === target.r && msg.payload?.q === target.q) stop();
      },
    );
    return () => {
      unlisten();
      unsubscribe();
      removeProvinceMark();
      setOverlayNotice(NOTICE, undefined);
    };
  }, [target, home]);
};
