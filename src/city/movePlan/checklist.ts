import { applyAction, SimAction, SimCity, SimRefusal, Tile, tileKey } from './rulesSimulator';
import { ignoringConnections, PlanRules, solveMovePlan, TargetCity, Unresolved } from './solveMovePlan';

/**
 * One line of the checklist: a step the player takes in the game, and how to tell from the city
 * that it has been taken. Waiting for an upgrade or a builder is not a line of its own - the step
 * that needs the wait says it is waiting.
 */
export interface ChecklistStep {
  action: Exclude<SimAction, { type: 'finish' }>;
  /** What the city shows once the step is done. */
  expect: Expectation;
  /** For each building a drag puts down somewhere other than its own spot: it is only being set aside. */
  aside?: number[];
  done: boolean;
}

export type Expectation =
  /**
   * Buildings standing where a drag put them. One only being set aside also counts once it has
   * gone on to its own spot: the helper sees the city only while its panel is open, and may never
   * catch it in between.
   */
  | { type: 'at'; buildings: { id: number; kind: string; x: number; y: number; then?: Tile }[] }
  | { type: 'level'; id: number; kind: string; level: number }
  | { type: 'placed'; kind: string; x: number; y: number }
  | { type: 'gone'; id: number; kind: string }
  /** Street tiles vacated, sold or moved anywhere. */
  | { type: 'noStreets'; tiles: Tile[] };

export interface Checklist {
  /** When the layout was sent, so a new one starts a new list. */
  sentAt: number;
  steps: ChecklistStep[];
  unresolved: Unresolved[];
}

/**
 * The plan for a layout as checklist lines, each with what it leaves behind. The plan is played
 * through to learn what each step brings about - which building lands where, which level an
 * upgrade reaches - and where each building ends up, to tell a move to its spot from one that
 * only sets it aside.
 */
export const toChecklist = (start: SimCity, target: TargetCity, rules: PlanRules, sentAt: number): Checklist => {
  const plan = solveMovePlan(start, target, rules);
  return {
    sentAt,
    steps: checklistSteps(ignoringConnections(start), plan.steps, plan.city),
    unresolved: plan.unresolved,
  };
};

const checklistSteps = (start: SimCity, actions: SimAction[], end: SimCity): ChecklistStep[] => {
  const steps: ChecklistStep[] = [];
  let city = start;
  for (const action of actions) {
    const before = city;
    const result = applyAction(city, action);
    if (!result.ok) break;
    city = result.city;
    if (action.type === 'finish') continue;

    const kindOf = (id: number) => (city.buildings.get(id) ?? before.buildings.get(id))!.kind;
    switch (action.type) {
      case 'chain':
      case 'upgradeAndMove': {
        const drops = action.drops.map((d) => {
          const final = end.buildings.get(d.id);
          const then = final && (final.x !== d.x || final.y !== d.y) ? { x: final.x, y: final.y } : undefined;
          return { id: d.id, kind: kindOf(d.id), x: d.x, y: d.y, ...(then ? { then } : {}) };
        });
        const aside = drops.filter((d) => d.then);
        const expect: Expectation =
          action.type === 'chain'
            ? { type: 'at', buildings: drops }
            : { type: 'level', id: action.id, kind: kindOf(action.id), level: city.buildings.get(action.id)!.level };
        steps.push({ action, expect, done: false, ...(aside.length ? { aside: aside.map((d) => d.id) } : {}) });
        break;
      }
      case 'upgrade':
        steps.push({
          action,
          expect: {
            type: 'level',
            id: action.id,
            kind: kindOf(action.id),
            level: city.buildings.get(action.id)!.level,
          },
          done: false,
        });
        break;
      case 'place':
        steps.push({
          action,
          expect: { type: 'placed', kind: action.building.kind, x: action.building.x, y: action.building.y },
          done: false,
        });
        break;
      case 'sell':
        steps.push({ action, expect: { type: 'gone', id: action.id, kind: kindOf(action.id) }, done: false });
        break;
      case 'sellStreets':
        steps.push({ action, expect: { type: 'noStreets', tiles: action.tiles }, done: false });
        break;
    }
  }
  return steps;
};

/**
 * Whether the city shows the step as done. A building is told by its id and its kind together,
 * never its id alone: the game hands a freed id to the next thing built.
 */
export const isDone = (expect: Expectation, city: SimCity): boolean => {
  const same = (id: number, kind: string) => {
    const b = city.buildings.get(id);
    return b && b.kind === kind ? b : undefined;
  };
  switch (expect.type) {
    case 'at':
      return expect.buildings.every(({ id, kind, x, y, then }) => {
        const b = same(id, kind);
        return (
          b !== undefined && ((b.x === x && b.y === y) || (then !== undefined && b.x === then.x && b.y === then.y))
        );
      });
    case 'level':
      return (same(expect.id, expect.kind)?.level ?? 0) >= expect.level;
    case 'placed':
      return [...city.buildings.values()].some((b) => b.kind === expect.kind && b.x === expect.x && b.y === expect.y);
    case 'gone':
      return !same(expect.id, expect.kind);
    case 'noStreets':
      return expect.tiles.every(({ x, y }) => !city.streets.has(tileKey(x, y)));
  }
};

/** Refusals that pass with time: a builder coming free, or an upgrade finishing. */
const WAITS: SimRefusal[] = ['busy', 'no-builder'];

/**
 * Plays the steps still to take against the city as it stands, letting the waits pass, to see
 * whether they still hold. A step taken out of order, or a move the plan never asked for, can
 * leave them unplayable - that is when the rest of the plan is worked out again. Connections are
 * left out, as the plan leaves them: laying streets is the player's business.
 */
const stillPlayable = (city: SimCity, steps: ChecklistStep[]) => {
  let at = ignoringConnections(city);
  for (const step of steps) {
    let result = applyAction(at, step.action);
    while (!result.ok && WAITS.includes(result.refusal)) {
      const holding = [...at.buildings.values()].find((b) => b.busy);
      if (!holding) break;
      at = { ...at, buildings: new Map(at.buildings).set(holding.id, { ...holding, busy: false }) };
      result = applyAction(at, step.action);
    }
    if (!result.ok) return false;
    at = result.city;
  }
  return true;
};

/**
 * The checklist brought up to date with the city: steps the city shows done are ticked, and stay
 * ticked even when a later step moves the same building on. When the steps left no longer play
 * from the city as it stands, they alone are worked out again; the ticked ones stay in the list.
 */
export const updateChecklist = (
  checklist: Checklist,
  city: SimCity,
  target: TargetCity,
  rules: PlanRules,
): Checklist => {
  const steps = checklist.steps.map((step) =>
    step.done || !isDone(step.expect, city) ? step : { ...step, done: true },
  );
  const remaining = steps.filter((step) => !step.done);
  if (stillPlayable(city, remaining)) {
    return { ...checklist, steps };
  }
  const replanned = toChecklist(city, target, rules, checklist.sentAt);
  return {
    ...checklist,
    steps: [...steps.filter((step) => step.done), ...replanned.steps],
    unresolved: replanned.unresolved,
  };
};

export type StepStatus = 'done' | 'next' | 'waiting' | 'later';

/** What holds a step up for now: a running upgrade, a busy builder, or a street not laid yet. */
const HOLDS: SimRefusal[] = [...WAITS, 'not-connected'];

/**
 * Where each step stands. The first step the game would take now is the one to do next; steps
 * held up only by a running upgrade, a busy builder or a missing street connection are waiting,
 * so the list does not stall behind them while moves that need none of these could go ahead.
 */
export const stepStatuses = (checklist: Checklist, city: SimCity): StepStatus[] => {
  let next = -1;
  return checklist.steps.map((step, index) => {
    if (step.done) return 'done';
    const result = applyAction(city, step.action);
    if (result.ok) {
      if (next === -1) {
        next = index;
        return 'next';
      }
      return 'later';
    }
    return HOLDS.includes(result.refusal) ? 'waiting' : 'later';
  });
};
