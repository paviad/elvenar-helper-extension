import React from 'react';
import { badgeSpriteInfo } from './badgeSpriteInfo';
import { MarkerData, MarkerTimeline } from './MarkerTimeline';

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

    // Flatten for TimelineData
    let idx = 1;
    const timelineData: MarkerData[] = [];
    for (const entry of result) {
      // badgeSpriteInfo carries the display name too, so it is the single source for both. A badge
      // with no entry has no sprite to draw; FaProgress filters those out the same way, and without
      // this one unlisted badge would take the whole timeline down.
      const spriteInfo = badgeSpriteInfo[entry.label];
      if (!spriteInfo) {
        continue;
      }
      for (const marker of entry.markers) {
        timelineData.push({
          id: `${entry.id}-${idx++}`,
          title: spriteInfo.name,
          time: new Date(marker.time.getTime()),
          value: marker.amount / 100,
          spriteX: spriteInfo.x * 26,
          spriteY: spriteInfo.y * 26,
        });
      }
    }
    return timelineData;
  }, [badgesInProduction, timestamp]);

  return <MarkerTimeline markers={data} startTime={now} spriteUrl={spriteUrl} endTime={endTime} />;
}
