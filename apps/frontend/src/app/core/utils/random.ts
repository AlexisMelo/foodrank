/**
 * `count` items of `items` picked at random, each at most once, in a random order; all of them, shuffled, when there
 * are fewer. The list given is not changed.
 * @param random source of random numbers, from 0 (included) to 1 (excluded), like Math.random (the default)
 */
export function pickRandom<T>(items: readonly T[], count: number, random = Math.random): T[] {
  const pool = [...items];
  const picked = Math.min(Math.max(count, 0), pool.length);
  // Partial Fisher-Yates: the first `picked` slots get a random item among the ones left
  for (let i = 0; i < picked; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, picked);
}
