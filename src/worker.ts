import { simulateTransfer } from './engine';
import type { WorkerRequest, WorkerResponse } from './worker-types';

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  if (ev.data.type !== 'simulate') return;
  try {
    const { orbsToSpend, maxFreeExtraDraws, multiplier } = ev.data;
    const result = simulateTransfer({ orbsToSpend, maxFreeExtraDraws, multiplier });
    const msg: WorkerResponse = {
      type: 'result',
      quantityTotals: result.quantityTotals,
      hitTotals: result.hitTotals,
      gachaCount: result.gachaCount,
      orbsUsed: result.orbsUsed,
      freeTransferCount: result.freeTransferCount,
      detailLog: result.detailLog,
    };
    self.postMessage(msg);
  } catch (e) {
    const msg: WorkerResponse = {
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
    self.postMessage(msg);
  }
};
