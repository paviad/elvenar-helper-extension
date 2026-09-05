import { DiplomacySubmitData } from '../model/spire';
import { backTranslations } from './backTranslations';
import { sendPicksBackToElvenar } from './sendPicksBackToElvenar';
import { SpireWizard } from './SpireWizard';
import { waitForChoiceToBe } from './waitForChoiceToBe';

export const submitDiplomacy = async (diplomacySubmitData: DiplomacySubmitData) => {
  const choice = SpireWizard.getState().choice;
  // Must be read before submitting, and acted on after: apiSubmitDiplomacy deliberately
  // skips submitChoice on a win, so nothing would ever advance the wizard past this choice.
  const won = isEncounterWon(diplomacySubmitData);

  await apiSubmitDiplomacy(diplomacySubmitData);

  if (won) {
    // Clear the badge and release anything still waiting on picks, rather than waiting
    // out the full timeout for a choice that will never arrive.
    sendPicksBackToElvenar({ turn: choice, picks: [] });
    return;
  }
  if (choice === 3) {
    return;
  }
  sendPicksBackToElvenar(await waitForChoiceToBe(choice + 1));
};

// The game's own verdict, plus the per-slot derivation apiSubmitDiplomacy already relied on.
const isEncounterWon = (diplomacySubmitData: DiplomacySubmitData) =>
  diplomacySubmitData.state === 'won' ||
  diplomacySubmitData.slots.every((s) => s.history[s.history.length - 1]?.result === 'correct');

const apiSubmitDiplomacy = async (diplomacySubmitData: DiplomacySubmitData) => {
  const turn = diplomacySubmitData.turn;
  if (isEncounterWon(diplomacySubmitData)) {
    return;
  }
  const results = diplomacySubmitData.slots
    .filter((s) => s.history.some((h) => h.turn === turn - 1))
    .map((s) => {
      const result = s.history.find((z) => z.turn === turn - 1);
      if (!result) {
        throw new Error(`No history found for slot in turn ${turn - 1}`);
      }
      return {
        slot: s.slot || 0,
        goodId: result.goodId,
        result: result.result,
      };
    });

  for (const res of results) {
    const backTranslation = backTranslations[res.goodId];
    if (!backTranslation) {
      throw new Error(`No back translation found for goodId ${res.goodId}`);
    }
    SpireWizard.setResult(turn - 1, res.slot, res.result === 'correct' ? 'G' : res.result === 'other' ? 'Y' : 'R');
  }

  await SpireWizard.submitChoice(turn - 1);
};
