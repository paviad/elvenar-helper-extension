/**
 * Ids for blocks the editor makes, kept in saved cities alongside the game's own small entity ids.
 * Counted up from the load time in microseconds, so ids from one page never repeat and those from
 * a later page start above them, and they stay safe integers for centuries. They used to be the
 * time with a counter appended as digits, which went past `Number.MAX_SAFE_INTEGER` - and so could
 * round onto each other - once the counter reached four digits.
 */
let next = Date.now() * 1000;

export const generateUniqueId = (): number => next++;
