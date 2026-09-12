import type { Rarity } from './config';

export function pullOnce(rng: () => number, table: Rarity[]): string | null {
  const valid = table.filter((r) => r.weight > 0);
  const total = valid.reduce((s, r) => s + r.weight, 0);
  if (total <= 0 || valid.length === 0) return null;

  let roll = rng() * total;
  for (const r of valid) {
    roll -= r.weight;
    if (roll < 0) return r.id;
  }
  return valid[valid.length - 1]!.id;
}

/** One independent "session": pulls until target rarity appears once. */
export function pullsUntilTarget(
  rng: () => number,
  table: Rarity[],
  targetId: string,
  maxPulls = 10_000,
): number | null {
  const hasTarget = table.some((r) => r.id === targetId && r.weight > 0);
  if (!hasTarget) return null;

  for (let i = 1; i <= maxPulls; i++) {
    const id = pullOnce(rng, table);
    if (id === targetId) return i;
  }
  return null;
}

export type BulkPullCounts = Record<string, number>;

/** n independent pulls; aggregate counts per rarity. */
export function simulatePullCounts(
  rng: () => number,
  table: Rarity[],
  n: number,
): BulkPullCounts {
  const counts: BulkPullCounts = {};
  for (const r of table) counts[r.id] = 0;
  for (let i = 0; i < n; i++) {
    const id = pullOnce(rng, table);
    if (id !== null) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** n independent sessions: pulls until target appears. */
export function simulateUntilTargetDistribution(
  rng: () => number,
  table: Rarity[],
  targetId: string,
  sessions: number,
  maxPullsPerSession = 10_000,
): number[] {
  const values: number[] = [];
  for (let s = 0; s < sessions; s++) {
    const pulls = pullsUntilTarget(rng, table, targetId, maxPullsPerSession);
    if (pulls !== null) values.push(pulls);
  }
  return values;
}
