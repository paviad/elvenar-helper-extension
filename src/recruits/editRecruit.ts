import { RecruitBook, RecruitStage, removeRecruit, restoreRecruit } from './recruitBook';

export interface RecruitEdit {
  playerId: number;
  stage?: RecruitStage;
  notes?: string;
  remove?: boolean;
  /** Brings a removed candidate back - or, for one removed before entries were kept, lifts the block. */
  restore?: boolean;
}

/** Applies a change made by hand. Returns whether the candidate was there to change. */
export const applyRecruitEdit = (book: RecruitBook, edit: RecruitEdit, at: number) => {
  const key = String(edit.playerId);
  const recruit = book.recruits[key];
  if (!recruit) {
    if (edit.restore && book.removed?.[key]) {
      delete book.removed[key];
      return true;
    }
    return false;
  }
  if (edit.remove) {
    removeRecruit(recruit, at);
    return true;
  }
  if (edit.restore) {
    restoreRecruit(recruit);
    return true;
  }
  if (edit.stage && edit.stage !== recruit.stage) {
    recruit.stage = edit.stage;
    recruit.stageAt = at;
  }
  if (edit.notes !== undefined) {
    if (edit.notes.trim()) {
      recruit.notes = edit.notes;
    } else {
      delete recruit.notes;
    }
  }
  return true;
};
