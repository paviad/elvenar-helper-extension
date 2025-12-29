import { Tome } from '../model/tome';

let tomes: Tome[] = [];

export async function sendTomesQuery(refresh = false) {
  if (!refresh && tomes.length > 0) {
    return;
  }

  // for (let chapter = maxChapter; chapter >= 1; chapter--) {
  const response = await fetch(
    'https://oxen.innogamescdn.com/frontend//static/en_DK/xml.balancing.rewards.reward_selection_kit.RewardSelectionKit_6c00f58ca35542ceaefa429b36ef22c3.json',
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

  tomes = await response.json();

  // const postResponse = await fetch("https://localhost:7274/api/buildings", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(buildings),
  // });
}

export const getTomes = () => tomes;
