// Injectable, seedable random number generator. Shuffles, Storm values, and the Swap position
// permutation all go through it, so a match is reproducible from its seed and its actions.

export interface Rng {
  /** Returns an integer in the inclusive range [min, max]. */
  nextInt(min: number, max: number): number;
}

/** mulberry32: small, fast, and good enough for card games. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    nextInt(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    }
  };
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
