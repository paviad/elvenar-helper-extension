export type QuestTaskPart = string | string[];
export type ParsedQuestExport = QuestTaskPart[][];

const parseQuestLine = (line: string): QuestTaskPart[] | null => {
  const numberedMatch = line.match(/^\s*\d+\.\s*(.+)$/);
  if (!numberedMatch) {
    return null;
  }

  const expression = numberedMatch[1].trim();
  if (!expression) {
    return [];
  }

  const andParts = expression
    .split(/\s+\+\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return andParts.map((part) => {
    const orParts = part
      .split(/\s+OR\s+/i)
      .map((item) => item.trim())
      .filter(Boolean);

    return orParts.length === 1 ? orParts[0] : orParts;
  });
};

export const parseQuestExport = (content: string): ParsedQuestExport => {
  const lines = content.split(/\r?\n/);
  const tasks: ParsedQuestExport = [];

  for (const line of lines) {
    const parsed = parseQuestLine(line);
    if (parsed !== null) {
      tasks.push(parsed);
    }
  }

  // Validation: Ensure the file actually looks like a quest export
  if (tasks.length < 20) {
    throw new Error(
      `Invalid quest file format. Please ensure you are uploading the correct .txt export.`
    );
  }

  return tasks;
};
