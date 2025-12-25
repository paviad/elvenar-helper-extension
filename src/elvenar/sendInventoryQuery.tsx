import { getFromStorage } from "../chrome/storage";
import { InventoryItem } from "../model/inventoryItem";

let inventoryItems: InventoryItem[] = [];

export async function sendInventoryQuery() {
  const url = await getFromStorage("reqUrl");

  if (!url) {
    alert("No URL found in storage.");
    return;
  }

  console.log("Retrieved URL from storage:", url);

  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7",
      "content-type": "application/json",
      "os-type": "browser",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-katmam": "shoval",
      "x-requested-with": "ElvenarHaxeClient",
      "x-squad-320": "lalala",
    },
    referrer: "https://en3.elvenar.com/game/index",
    body: 'f6a9296fd2[{"__class__":"ServerRequestVO","requestData":[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":75}]',
    method: "POST",
    mode: "cors",
    credentials: "include",
  });

  const json = await response.json();

  // console.log("Response JSON:", json);

  inventoryItems = json[1].responseData;

  console.log("Inventory Items:", inventoryItems);

  // const postResponse = await fetch("https://localhost:7274/api/inventory", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(inventoryItems),
  // });
}
