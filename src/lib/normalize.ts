/**
 * Unicode-aware answer normalization.
 *
 * Goals:
 *  - capitalization, spacing, curly quotes and common punctuation do not matter
 *  - meaningful symbols stay meaningful (Nidoran♀ !== Nidoran♂)
 *  - no aggressive stemming or punctuation stripping on proper names
 */

const CURLY_APOSTROPHES = /[\u2018\u2019\u201B\u02BC\uFF07]/g;
const CURLY_QUOTES = /[\u201C\u201D\u00AB\u00BB]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;
const CONTROL_AND_BIDI =
  /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

export function stripUnsafe(input: string): string {
  return input.normalize("NFKC").replace(CONTROL_AND_BIDI, "");
}

/** Trim, collapse whitespace, remove control/invisible formatting. */
export function cleanAnswer(input: string): string {
  return stripUnsafe(String(input ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

/** Display form: same as cleanAnswer, capped at 120 characters. */
export function displayAnswer(input: string): string {
  return cleanAnswer(input).slice(0, 120);
}

/**
 * Matching key. Keeps letters, digits, spaces and meaningful symbols such as
 * ♀ ♂ # + &; folds apostrophes, quotes and dashes to simple forms.
 */
export function normalizeKey(input: string): string {
  return cleanAnswer(input)
    .replace(CURLY_APOSTROPHES, "'")
    .replace(CURLY_QUOTES, '"')
    .replace(DASHES, "-")
    .toLowerCase()
    .normalize("NFKC");
}

/** Diacritic-insensitive variant used only as a secondary lookup. */
export function looseKey(input: string): string {
  return normalizeKey(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}

export function normalizeNickname(input: string): string {
  return cleanAnswer(input).replace(/\s+/g, " ").toLowerCase();
}

/**
 * Damerau-Levenshtein distance capped at `max` (early exit).
 * Adjacent transposition counts as one edit.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const aChars = [...a];
  const bChars = [...b];
  const rows = aChars.length + 1;
  const cols = bChars.length + 1;
  let prevPrev = new Array<number>(cols).fill(0);
  let prev = new Array<number>(cols).fill(0);
  let curr = new Array<number>(cols).fill(0);
  for (let j = 0; j < cols; j += 1) prev[j] = j;

  for (let i = 1; i < rows; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j < cols; j += 1) {
      const cost = aChars[i - 1] === bChars[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (
        i > 1 &&
        j > 1 &&
        aChars[i - 1] === bChars[j - 2] &&
        aChars[i - 2] === bChars[j - 1]
      ) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    const spare = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = spare;
  }
  return prev[cols - 1];
}

/** True when a string contains only safe, printable characters. */
export function isSafeText(input: string): boolean {
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(
    input,
  );
}
