import { getFromStorage } from '../chrome/storage';
import { InventoryItem } from '../model/inventoryItem';

let inventoryItems: InventoryItem[] = [];

export async function sendInventoryQuery(refresh = false) {
  if (!refresh && inventoryItems.length > 0) {
    return;
  }

  const url = await getFromStorage('reqUrl');

  if (!url) {
    alert('No URL found in storage.');
    return;
  }

  const reqBody = await getFromStorage('reqBodyInventory');

  if (!reqBody) {
    alert('No Request Body found in storage. Open your inventory in the game and try again.');
    return;
  }

  const response = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
      'content-type': 'application/json',
      'os-type': 'browser',
      priority: 'u=1, i',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'ElvenarHaxeClient',
    },
    referrer: 'https://en3.elvenar.com/game',
    body: reqBody,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });

  if (!response.ok) {
    alert(
      'Your game session has expired since last time you used this tool. Please refresh the game tab and then refresh this tab.',
    );
    return;
  }

  const json = await response.json();

  inventoryItems = json[1].responseData;

  // const postResponse = await fetch("https://localhost:7274/api/inventory", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(inventoryItems),
  // });
}

export const getInventoryItems = () => inventoryItems;
