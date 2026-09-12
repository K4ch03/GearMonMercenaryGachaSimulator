import type { Rarity } from './config';
import type { BulkPullCounts } from './engine';
import type { RarityStatRow, UntilTargetSummary, HistogramBin } from './stats';

export type WorkerRunRequest = {
  type: 'run';
  rarities: Rarity[];
  targetRarityId: string;
  pullCount: number;
  sessionCount: number;
  seed: number | null;
  progressEvery: number;
};

export type WorkerProgress = {
  type: 'progress';
  phase: 'pulls' | 'sessions';
  done: number;
  total: number;
};

export type WorkerResult = {
  type: 'result';
  counts: BulkPullCounts;
  pullCount: number;
  rarityStats: RarityStatRow[];
  untilValues: number[];
  untilSummary: UntilTargetSummary;
  untilHistogram: HistogramBin[];
};

export type WorkerError = { type: 'error'; message: string };

export type WorkerOut = WorkerProgress | WorkerResult | WorkerError;
