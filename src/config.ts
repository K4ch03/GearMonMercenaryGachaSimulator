export type Rarity = {
  id: string;
  name: string;
  weight: number;
  color: string;
};

export type SimConfig = {
  rarities: Rarity[];
  /** Rarity id for "pulls until first hit" distribution */
  targetRarityId: string;
};

export const STORAGE_KEY = 'gacha-sim-config-v1';

export const DEFAULT_RARITIES: Rarity[] = [
  { id: 'ssr', name: 'SSR', weight: 1, color: '#f5c542' },
  { id: 'sr', name: 'SR', weight: 9, color: '#a855f7' },
  { id: 'r', name: 'R', weight: 30, color: '#3b82f6' },
  { id: 'n', name: 'N', weight: 60, color: '#94a3b8' },
];

export function defaultSimConfig(): SimConfig {
  return {
    rarities: DEFAULT_RARITIES.map((r) => ({ ...r })),
    targetRarityId: 'ssr',
  };
}

export function totalWeight(rarities: Rarity[]): number {
  return rarities.reduce((s, r) => s + Math.max(0, r.weight), 0);
}

export function normalizedPercent(weight: number, total: number): number {
  if (total <= 0) return 0;
  return (weight / total) * 100;
}

export function newRarityId(existing: Rarity[]): string {
  let n = existing.length + 1;
  let id = `r${n}`;
  while (existing.some((r) => r.id === id)) {
    n += 1;
    id = `r${n}`;
  }
  return id;
}
