import type { WorkerRunRequest, WorkerOut } from './worker-types';
import { createRng } from './rng';
import { pullOnce, pullsUntilTarget } from './engine';
import {
  buildRarityStats,
  histogramUntilTarget,
  summarizeUntilTarget,
} from './stats';

function post(msg: WorkerOut) {
  self.postMessage(msg);
}

self.onmessage = (ev: MessageEvent<WorkerRunRequest>) => {
  const msg = ev.data;
  if (msg.type !== 'run') return;

  try {
    const { rarities, targetRarityId, pullCount, sessionCount, seed, progressEvery } = msg;
    const rng = createRng(seed);
    const chunk = Math.max(1, progressEvery);

    const counts: Record<string, number> = {};
    for (const r of rarities) counts[r.id] = 0;

    for (let i = 0; i < pullCount; i++) {
      const id = pullOnce(rng, rarities);
      if (id !== null) counts[id] = (counts[id] ?? 0) + 1;
      if ((i + 1) % chunk === 0 || i === pullCount - 1) {
        post({ type: 'progress', phase: 'pulls', done: i + 1, total: pullCount });
      }
    }

    const untilValues: number[] = [];
    for (let s = 0; s < sessionCount; s++) {
      const pulls = pullsUntilTarget(rng, rarities, targetRarityId);
      if (pulls !== null) untilValues.push(pulls);
      if ((s + 1) % chunk === 0 || s === sessionCount - 1) {
        post({
          type: 'progress',
          phase: 'sessions',
          done: s + 1,
          total: sessionCount,
        });
      }
    }

    const rarityStats = buildRarityStats(rarities, counts, pullCount);
    const untilSummary = summarizeUntilTarget(untilValues);
    const untilHistogram = histogramUntilTarget(untilValues);

    post({
      type: 'result',
      counts,
      pullCount,
      rarityStats,
      untilValues,
      untilSummary,
      untilHistogram,
    });
  } catch (e) {
    post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
