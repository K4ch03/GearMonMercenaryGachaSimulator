import type { Rarity } from './config';
import { totalWeight, normalizedPercent } from './config';
import type { BulkPullCounts } from './engine';

export type RarityStatRow = {
  id: string;
  name: string;
  color: string;
  count: number;
  expected: number;
  diff: number;
  actualPercent: number;
  theoryPercent: number;
};

export function buildRarityStats(
  rarities: Rarity[],
  counts: BulkPullCounts,
  totalPulls: number,
): RarityStatRow[] {
  const tw = totalWeight(rarities);
  return rarities.map((r) => {
    const count = counts[r.id] ?? 0;
    const expected = tw > 0 ? (totalPulls * r.weight) / tw : 0;
    const actualPercent = totalPulls > 0 ? (count / totalPulls) * 100 : 0;
    const theoryPercent = normalizedPercent(r.weight, tw);
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      count,
      expected,
      diff: count - expected,
      actualPercent,
      theoryPercent,
    };
  });
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export type UntilTargetSummary = {
  count: number;
  mean: number;
  median: number;
  p90: number;
  min: number;
  max: number;
  cappedSessions: number;
};

export function summarizeUntilTarget(values: number[]): UntilTargetSummary {
  if (values.length === 0) {
    return { count: 0, mean: 0, median: 0, p90: 0, min: 0, max: 0, cappedSessions: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    mean: sum / sorted.length,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    cappedSessions: 0,
  };
}

export type HistogramBin = { label: string; from: number; to: number; count: number };

/** Fixed-width bins for pull counts (1-based). */
export function histogramUntilTarget(
  values: number[],
  binWidth = 10,
  maxDisplay = 100,
): HistogramBin[] {
  if (values.length === 0) return [];

  const maxVal = Math.min(Math.max(...values), maxDisplay);
  const numBins = Math.max(1, Math.ceil(maxVal / binWidth));
  const bins: HistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const from = i * binWidth + 1;
    const to = (i + 1) * binWidth;
    bins.push({
      label: `${from}-${to}`,
      from,
      to,
      count: 0,
    });
  }

  let overflow = 0;
  for (const v of values) {
    if (v > maxDisplay) {
      overflow += 1;
      continue;
    }
    const idx = Math.min(numBins - 1, Math.floor((v - 1) / binWidth));
    bins[idx]!.count += 1;
  }

  if (overflow > 0) {
    bins.push({
      label: `${maxDisplay + 1}+`,
      from: maxDisplay + 1,
      to: Infinity,
      count: overflow,
    });
  }

  return bins.filter((b) => b.count > 0 || b.from <= maxVal);
}
