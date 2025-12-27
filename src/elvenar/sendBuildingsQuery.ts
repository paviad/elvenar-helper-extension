import { getFromStorage } from '../chrome/storage';
import { Building } from '../model/building';

let buildings: Building[] = [];

export async function sendBuildingsQuery(chapter = 24) {
  // for (let chapter = maxChapter; chapter >= 1; chapter--) {
  const response = await fetch(
    `https://oxen.innogamescdn.com/frontend//static/feature_flags/ch${chapter}/en_DK/xml.balancing.city.Buildings_8fbb20117a2e1ee15d339ec130b7ff32.json`,
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

  buildings = await response.json();

  console.log('Buildings data:', buildings);

  // const postResponse = await fetch("https://localhost:7274/api/buildings", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(buildings),
  // });
}

export const getBuildings = () => buildings;
