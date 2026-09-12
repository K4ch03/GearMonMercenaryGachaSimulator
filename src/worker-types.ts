import type { GachaDetailLog, TransferMultiplier } from './engine';

export type WorkerRequest = {
  type: 'simulate';
  orbsToSpend: number;
  maxFreeExtraDraws: number;
  multiplier: TransferMultiplier;
};

export type WorkerResponse =
  | {
      type: 'result';
      quantityTotals: Record<string, number>;
      hitTotals: Record<string, number>;
      gachaCount: number;
      orbsUsed: number;
      freeTransferCount: number;
      detailLog?: GachaDetailLog;
    }
  | { type: 'error'; message: string };
