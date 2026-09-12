import {
  CATEGORY_ORDER,
  stackDisplaySuffix,
  GACHA_ITEMS,
  type GachaItem,
} from './data/catalog';

export type TransferMultiplier = 1 | 10;

export type SimParams = {
  orbsToSpend: number;
  maxFreeExtraDraws: number;
  multiplier: TransferMultiplier;
  freeThresholdStart?: number;
  rng?: () => number;
};

export type ItemTotals = Record<string, number>;

export type PickLogEntry = {
  itemName: string;
  category: string;
  color: string;
  acquired: boolean;
};

export type SegmentLog = {
  title: string;
  pickCount: number;
  entries: PickLogEntry[];
};

export type GachaDetailLog = {
  segments: SegmentLog[];
};

export type SimResult = {
  quantityTotals: ItemTotals;
  hitTotals: ItemTotals;
  gachaCount: number;
  orbsUsed: number;
  freeTransferCount: number;
  detailLog?: GachaDetailLog;
};

export const DEFAULT_ORBS = 10_000;
export const DEFAULT_FREE_EXTRA = 4;
export const DEFAULT_FREE_THRESHOLD = 5;
/** 1倍転送1回あたりの転送神珠消費 */
export const ORBS_PER_GACHA = 10;

export function orbsCostPerGacha(multiplier: TransferMultiplier): number {
  return ORBS_PER_GACHA * multiplier;
}

export const BASE_PICK_COUNT = 10;

const APPEARANCE_WEIGHT_SUM = GACHA_ITEMS.reduce((s, i) => s + i.appearancePercent, 0);

const categoryIndexMap = new Map<string, number>();
CATEGORY_ORDER.forEach((c, i) => categoryIndexMap.set(c, i));

function categoryIndex(category: string): number {
  return categoryIndexMap.get(category) ?? 999;
}

function pickItemByAppearance(rng: () => number): GachaItem {
  let roll = rng() * APPEARANCE_WEIGHT_SUM;
  for (const item of GACHA_ITEMS) {
    roll -= item.appearancePercent;
    if (roll <= 0) return item;
  }
  return GACHA_ITEMS[GACHA_ITEMS.length - 1]!;
}

function rollAcquisition(item: GachaItem, rng: () => number): boolean {
  return rng() * 100 < item.acquisitionPercent;
}

export type SegmentResult = {
  quantities: ItemTotals;
  hits: ItemTotals;
  /** 獲得成功した枠の数（無料追加転送の条件判定に使用） */
  acquiredUnitCount: number;
  log: PickLogEntry[];
};

export function runPickSegment(
  pickCount: number,
  multiplier: TransferMultiplier,
  rng: () => number,
): SegmentResult {
  const quantities: ItemTotals = {};
  const hits: ItemTotals = {};
  const log: PickLogEntry[] = [];
  let acquiredUnitCount = 0;

  for (let i = 0; i < pickCount; i++) {
    const item = pickItemByAppearance(rng);
    const acquired = rollAcquisition(item, rng);
    log.push({
      itemName: item.name,
      category: item.category,
      color: item.color,
      acquired,
    });

    if (!acquired) continue;

    acquiredUnitCount += 1;
    hits[item.id] = (hits[item.id] ?? 0) + 1;
    const qty = item.quantityPerHit * multiplier;
    quantities[item.id] = (quantities[item.id] ?? 0) + qty;
  }

  return { quantities, hits, acquiredUnitCount, log };
}

function formatSegmentLogTitle(segmentIndex: number, pickCount: number, acquiredUnitCount: number): string {
  const base =
    segmentIndex === 0 ? `出現抽選（${pickCount}枠）` : `無料追加 ${segmentIndex}（${pickCount}枠）`;
  return `${base} — 獲得 ${acquiredUnitCount} 個`;
}

function mergeInto(target: ItemTotals, add: ItemTotals) {
  for (const [id, n] of Object.entries(add)) {
    target[id] = (target[id] ?? 0) + n;
  }
}

export function executeOneGacha(params: {
  multiplier: TransferMultiplier;
  maxFreeExtraDraws: number;
  freeThresholdStart: number;
  rng: () => number;
  collectDetailLog?: boolean;
}): {
  quantities: ItemTotals;
  hits: ItemTotals;
  freeTransferCount: number;
  detailLog?: GachaDetailLog;
} {
  const { multiplier, maxFreeExtraDraws, freeThresholdStart, rng, collectDetailLog } = params;
  const quantities: ItemTotals = {};
  const hits: ItemTotals = {};
  let freeTransferCount = 0;
  const segments: SegmentLog[] = [];

  let threshold = freeThresholdStart;
  let freeSlotsLeft = maxFreeExtraDraws;
  let pickCount = BASE_PICK_COUNT;
  let segmentIndex = 0;

  let segment = runPickSegment(pickCount, multiplier, rng);
  if (collectDetailLog) {
    segments.push({
      title: formatSegmentLogTitle(segmentIndex, pickCount, segment.acquiredUnitCount),
      pickCount,
      entries: segment.log,
    });
  }
  mergeInto(quantities, segment.quantities);
  mergeInto(hits, segment.hits);

  while (freeSlotsLeft > 0) {
    // 直前の抽選ブロックで獲得成功した個数が条件以上のときだけ無料追加
    if (segment.acquiredUnitCount < threshold) break;

    freeSlotsLeft -= 1;
    freeTransferCount += 1;
    threshold += 1;
    pickCount += 1;
    segmentIndex += 1;

    segment = runPickSegment(pickCount, multiplier, rng);
    if (collectDetailLog) {
      segments.push({
        title: formatSegmentLogTitle(segmentIndex, pickCount, segment.acquiredUnitCount),
        pickCount,
        entries: segment.log,
      });
    }
    mergeInto(quantities, segment.quantities);
    mergeInto(hits, segment.hits);
  }

  return {
    quantities,
    hits,
    freeTransferCount,
    detailLog: collectDetailLog ? { segments } : undefined,
  };
}

export function simulateTransfer(params: SimParams): SimResult {
  const rng = params.rng ?? Math.random;
  const freeStart = params.freeThresholdStart ?? DEFAULT_FREE_THRESHOLD;
  let orbsLeft = Math.max(0, Math.floor(params.orbsToSpend));
  const maxFree = Math.max(0, Math.floor(params.maxFreeExtraDraws));

  const quantityTotals: ItemTotals = {};
  const hitTotals: ItemTotals = {};
  let gachaCount = 0;
  let freeTransferCount = 0;

  const costPerGacha = orbsCostPerGacha(params.multiplier);
  const plannedGachaCount = Math.floor(orbsLeft / costPerGacha);
  const collectDetailLog = plannedGachaCount === 1;
  let detailLog: GachaDetailLog | undefined;

  while (orbsLeft >= costPerGacha) {
    orbsLeft -= costPerGacha;
    gachaCount += 1;

    const batch = executeOneGacha({
      multiplier: params.multiplier,
      maxFreeExtraDraws: maxFree,
      freeThresholdStart: freeStart,
      rng,
      collectDetailLog,
    });
    mergeInto(quantityTotals, batch.quantities);
    mergeInto(hitTotals, batch.hits);
    freeTransferCount += batch.freeTransferCount;
    if (batch.detailLog) detailLog = batch.detailLog;
  }

  return {
    quantityTotals,
    hitTotals,
    gachaCount,
    orbsUsed: gachaCount * costPerGacha,
    freeTransferCount,
    detailLog,
  };
}

export type ResultLine = {
  item: GachaItem;
  /** 合計値（名前内数値×倍率の合計） */
  totalValue: number;
  /** 獲得成功回数 */
  hitCount: number;
  stackSuffix: string | null;
};

export function buildResultLines(result: SimResult): ResultLine[] {
  const byId = new Map(GACHA_ITEMS.map((i) => [i.id, i]));
  const lines: ResultLine[] = [];

  for (const [id, totalValue] of Object.entries(result.quantityTotals)) {
    if (totalValue <= 0) continue;
    const item = byId.get(id);
    if (!item) continue;

    const hitCount = result.hitTotals[id] ?? 0;
    lines.push({
      item,
      totalValue,
      hitCount,
      stackSuffix: stackDisplaySuffix(item.category),
    });
  }

  return lines.sort((a, b) => {
    const catA = categoryIndex(a.item.category);
    const catB = categoryIndex(b.item.category);
    if (catA !== catB) return catA - catB;
    return a.item.name.localeCompare(b.item.name, 'ja');
  });
}
