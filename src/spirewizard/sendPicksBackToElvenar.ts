import { ChoiceResult } from './waitForChoiceToBe';

export const sendPicksBackToElvenar = ({ picks, prob, jokerGhost, turn }: ChoiceResult) => {
  const message = {
    type: 'spirePicks',
    payload: picks,
    prob,
    jokerGhost,
    turn,
  };
  window.postMessage(message, '*');
};
