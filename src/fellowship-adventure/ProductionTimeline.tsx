import React from 'react';
import { MarkerData, MarkerTimeline } from './MarkerTimeline';
import { badgeSpriteInfo } from './badgeSpriteInfo';

export function ProductionTimeline(props: {
  badgesInProduction: Record<string, Record<number, number>>;
  timestamp: number;
  endTime?: number;
}) {
  const { badgesInProduction, timestamp, endTime } = props;

  const now = new Date();

  const spriteUrl = chrome.runtime.getURL('sprite.png');

  const data: MarkerData[] = React.useMemo(() => {
    const result: { id: string; label: string; markers: { time: Date; amount: number }[] }[] = [];
    for (const badgeName in badgesInProduction) {
      const prodMap = badgesInProduction[badgeName];
      const id = `${timestamp}-${badgeName}`;
      const markers: { time: Date; amount: number }[] = [];
      for (const secondsStr in prodMap) {
        const seconds = parseInt(secondsStr, 10);
        const amount = prodMap[seconds];
        const time = new Date(timestamp + seconds * 1000);
        markers.push({ time, amount });
      }
      result.push({ id, label: badgeName, markers });
    }

    const titleMap: Record<string, string> = {
      badge_brewery: 'Breweries',
      badge_carpenters: 'Carpenters',
      badge_farmers: 'Farmers',
      badge_blacksmith: 'Blacksmiths',
      golden_bracelet: 'Bracelets',
      diamond_necklace: 'Necklaces',
      elegant_statue: 'Statues',
      witch_hat: 'Hats',
      druid_staff: 'Staffs',
      badge_wonderhelper: 'AW',
      badge_unit: 'Elvarian',
      money_sack: 'Money',
      arcane_residue: 'Residue',
      recycled_potion: 'Potions',
      enchanted_tiara: 'Tiaras',
      ghost_in_a_bottle: 'Ghosts',
    };

    // Flatten for TimelineData
    let idx = 1;
    const timelineData: MarkerData[] = [];
    for (const entry of result) {
      for (const marker of entry.markers) {
        timelineData.push({
          id: `${entry.id}-${idx++}`,
          title: titleMap[entry.label],
          time: new Date(marker.time.getTime()),
          value: marker.amount / 100,
          spriteX: badgeSpriteInfo[entry.label].x * 26,
          spriteY: badgeSpriteInfo[entry.label].y * 26,
        });
      }
    }
    return timelineData;
  }, [badgesInProduction, timestamp]);

  return <MarkerTimeline markers={data} startTime={now} spriteUrl={spriteUrl} endTime={endTime} />;
}
