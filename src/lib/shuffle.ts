/**
 * Deterministic shuffling.
 *
 * These lists (quiz questions, sorter statements) are shuffled during render on
 * both the server and the client, so `Math.random()` is not an option - the two
 * passes would disagree and React would report a hydration mismatch. Instead
 * the order is a pure function of a `seed` held in component state: identical
 * on both sides, and re-shuffled by bumping the seed in an event handler.
 */

/** mulberry32 - small, fast, good enough for shuffling a ten-item list. */
function createRandom(seed: number): () => number {
  let state = seed + 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates using a seeded PRNG. Returns a new array. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const random = createRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
