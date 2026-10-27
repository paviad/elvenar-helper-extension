import { ChecklistStep } from '../../city/movePlan/checklist';
import { Unresolved } from '../../city/movePlan/solveMovePlan';

/** How the player knows a building: its name in the game. */
export interface Names {
  /** A building kind, as the catalogue's base name. */
  kind: (kind: string) => string;
}

export interface StepText {
  title: string;
  detail?: string;
}

/** What a checklist line says. The map beside it shows where, since the game shows no coordinates. */
export const describeStep = (step: ChecklistStep, names: Names): StepText => {
  const { action, expect } = step;
  switch (action.type) {
    case 'chain': {
      const moved = expect.type === 'at' ? expect.buildings.map((b) => names.kind(b.kind)) : [];
      const aside = expect.type === 'at' ? expect.buildings.filter((b) => b.then).map((b) => names.kind(b.kind)) : [];
      const asideNote = aside.length ? `${aside.join(' and ')} only goes to a spare spot for now.` : undefined;
      if (moved.length === 1) {
        return { title: aside.length ? `Set ${moved[0]} aside` : `Move ${moved[0]}`, detail: asideNote };
      }
      return {
        title: `Move ${moved.join(' → ')}`,
        detail: ['One drag: put each down on its number, and the building it lands on comes up next.', asideNote]
          .filter(Boolean)
          .join(' '),
      };
    }
    case 'upgrade':
      return { title: `Upgrade ${names.kind(expectKind(step))} to level ${expectLevel(step)}` };
    case 'upgradeAndMove':
      return {
        title: `Upgrade ${names.kind(expectKind(step))} to level ${expectLevel(step)}`,
        detail:
          action.drops.length > 1
            ? 'Its new shape does not fit where it stands, so the game hands it to you: put each down on its number.'
            : 'Its new shape does not fit where it stands, so the game hands it to you: put it down on the marked spot.',
      };
    case 'place':
      return { title: `Place ${names.kind(action.building.kind)} from the inventory` };
    case 'sell':
      return { title: `Sell ${names.kind(expectKind(step))}` };
    case 'sellStreets': {
      const count = action.tiles.length === 1 ? '1 street tile' : `${action.tiles.length} street tiles`;
      const coming = [...new Set((action.for ?? []).map((f) => names.kind(f.kind)))];
      const forWhom = coming.length ? ` for ${coming.join(' and ')}` : '';
      // The free street is not worth keeping; any other the player may rather move than sell.
      return action.free
        ? { title: `Sell ${count}${forWhom}` }
        : { title: `Vacate ${count}${forWhom}`, detail: 'Sell them, or move them anywhere.' };
    }
  }
};

const expectKind = (step: ChecklistStep) => ('kind' in step.expect ? step.expect.kind : '');
const expectLevel = (step: ChecklistStep) => (step.expect.type === 'level' ? step.expect.level : 0);

/** What a line at the end of the list says about something the plan cannot do. */
export const describeUnresolved = (
  unresolved: Unresolved,
  names: Names,
  kindOf: (id: number) => string | undefined,
) => {
  const named = (id: number) => {
    const kind = kindOf(id);
    return kind ? names.kind(kind) : 'A building';
  };
  switch (unresolved.reason) {
    case 'lower-level':
      return `${names.kind(unresolved.kind)} is at a lower level in the layout than in your city, and there is no downgrading.`;
    case 'unknown-size':
      return `The game's catalogue does not say how big ${names.kind(unresolved.kind)} is at a level it has to reach.`;
    case 'locked':
      return `${names.kind(unresolved.kind)} is placed on ground you have not unlocked yet.`;
    case 'no-room':
      return `There is no spare ground to set a building aside on, so ${unresolved.ids.map(named).join(', ')} cannot be moved yet.`;
    case 'refused':
      return `The plan made a step the game would refuse (${unresolved.refusal}). This is a fault in the plan; please report it.`;
  }
};
