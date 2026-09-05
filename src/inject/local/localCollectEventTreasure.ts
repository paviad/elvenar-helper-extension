import { concatMap, of, Subject, tap, timer } from 'rxjs';
import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';

const processRewardSubject = new Subject<string>();

const firstDelay = 10;

processRewardSubject
  .pipe(
    concatMap((z, i) => {
      console.log(`waiting ${i === 0 ? firstDelay : 1} seconds`);
      return timer(i === 0 ? firstDelay * 1000 : 1000).pipe(tap((_) => of(processOneReward(z))));
    }),
  )
  .subscribe({
    error: (err) => console.warn('Error processing rewards:', err),
  });

export const localCollectEventTreasure = async (json: ElvenarRequestResponseEntry[]): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait a bit to ensure the game has processed the reward and updated the treasures list

  const treasures = window.aviad_tv.getTreasures('currency_event');

  for (const treasure of treasures) {
    console.log('New treasure found with id', treasure.id, 'queuing it for processing');
    processRewardSubject.next(treasure.id);
  }

  return;
};

const processOneReward = (treasureId: string) => {
  console.log('Processing reward with id', treasureId);
  const treasures = window.aviad_tv.getTreasures('currency_event');
  const treasure = treasures.find((t) => t.id === treasureId);

  if (!treasure) {
    console.log('already processed');
    return;
  }

  const evClass = window.aviad['de.innogames.onyx.city.engine.events.IsoDecorationEvent'];
  const event = new evClass('IsoDecorationEvent::click', treasureId);
  window.aviad_silm.isoEngine.dispatchEvent(event);
};
