import { getFromStorage } from '../chrome/storage';
import { Trade } from '../model/trade';

let trades: Trade[] = [];

export async function sendTradeQuery(refresh = false) {
  if (!refresh && trades.length > 0) {
    return;
  }

  const url = await getFromStorage('reqUrl');

  if (!url) {
    return;
  }

  const reqBody = await getFromStorage('reqBodyTrade');

  if (!reqBody) {
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

  trades = json[0].responseData;

  // const postResponse = await fetch("https://localhost:7274/api/inventory", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(inventoryItems),
  // });
}

export const getTradeItems = () => trades;
