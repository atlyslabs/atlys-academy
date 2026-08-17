/**
 * Roman numerals for the academy's indexes. Days are data (`DayId` 1-5);
 * the numeral is purely how the index renders them.
 */
const NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

export function romanNumeral(n: number): string {
  return NUMERALS[n - 1] ?? String(n);
}
