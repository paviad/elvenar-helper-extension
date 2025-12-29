import { ItemDefinition } from '../model/itemDefinition';

let items: ItemDefinition[] = [];

export async function sendItemsQuery(refresh = false) {
  if (!refresh && items.length > 0) {
    return;
  }

  // for (let chapter = maxChapter; chapter >= 1; chapter--) {
  const response = await fetch(
    'https://oxen.innogamescdn.com/frontend//static/en_DK/xml.balancing.city.Items_2ea99cbc21ca48354cabd64d43259665.json',
    {
      headers: {
        'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
      referrer: 'https://en3.elvenar.com/',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    },
  );

  items = await response.json();

  // const postResponse = await fetch("https://localhost:7274/api/buildings", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(buildings),
  // });
}

export const getItemDefinitions = () => items;
