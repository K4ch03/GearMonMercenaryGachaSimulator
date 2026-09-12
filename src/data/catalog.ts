export type GachaItem = {
  id: string;
  category: string;
  name: string;
  /** 出現確率（%）— 10枠の weighted pick 用 */
  appearancePercent: number;
  /** 獲得確率（%）— 出現後に獲得するか */
  acquisitionPercent: number;
  quantityPerHit: number;
  color: string;
};

export const CATEGORY_COLORS: Record<string, string> = {
  ミシック傭兵: '#963126',
  レジェンド傭兵: '#FFC000',
  エピック傭兵: '#582983',
  レア傭兵: '#4568CB',
  戦闘経験書: '#048240',
  傭兵徽章: '#048240',
  コイン: '#048240',
  ダイヤ: '#048240',
};

const RAW: {
  category: string;
  name: string;
  appearancePercent: number;
  acquisitionPercent: number;
}[] = [
  { category: 'ミシック傭兵', name: '逍遥剣聖', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '太陽の子', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '火魔導士', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '氷結の翼', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '炎魔の妖姫', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '幻術の魔女', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'ミシック傭兵', name: '天使の翼', appearancePercent: 0.14, acquisitionPercent: 2 },
  { category: 'レジェンド傭兵', name: '雷霊', appearancePercent: 1.25, acquisitionPercent: 8 },
  { category: 'レジェンド傭兵', name: '賭博師', appearancePercent: 1.25, acquisitionPercent: 8 },
  { category: 'レジェンド傭兵', name: '雪女', appearancePercent: 1.25, acquisitionPercent: 8 },
  { category: 'レジェンド傭兵', name: '星月の精霊', appearancePercent: 1.25, acquisitionPercent: 8 },
  { category: 'エピック傭兵', name: '光明祭祀', appearancePercent: 3.75, acquisitionPercent: 24 },
  { category: 'エピック傭兵', name: '女狙撃手', appearancePercent: 3.75, acquisitionPercent: 24 },
  { category: 'エピック傭兵', name: '電磁博士', appearancePercent: 3.75, acquisitionPercent: 24 },
  { category: 'エピック傭兵', name: '烈焔ガードマン', appearancePercent: 3.75, acquisitionPercent: 24 },
  { category: 'レア傭兵', name: 'フードの魔道士', appearancePercent: 7.5, acquisitionPercent: 48 },
  { category: 'レア傭兵', name: '氷杖の魔道士', appearancePercent: 7.5, acquisitionPercent: 48 },
  { category: 'レア傭兵', name: '爆撃手', appearancePercent: 7.5, acquisitionPercent: 48 },
  { category: 'レア傭兵', name: '小僧', appearancePercent: 7.5, acquisitionPercent: 48 },
  { category: '戦闘経験書', name: '戦闘経験書x8', appearancePercent: 12.02, acquisitionPercent: 50 },
  { category: '戦闘経験書', name: '戦闘経験書x12', appearancePercent: 8, acquisitionPercent: 50 },
  { category: '戦闘経験書', name: '戦闘経験書x20', appearancePercent: 4, acquisitionPercent: 50 },
  { category: '傭兵徽章', name: '傭兵徽章', appearancePercent: 5, acquisitionPercent: 50 },
  { category: 'コイン', name: 'コインx100', appearancePercent: 5, acquisitionPercent: 50 },
  { category: 'コイン', name: 'コインx200', appearancePercent: 5, acquisitionPercent: 50 },
  { category: 'ダイヤ', name: 'ダイヤx10', appearancePercent: 5, acquisitionPercent: 50 },
  { category: 'ダイヤ', name: 'ダイヤx20', appearancePercent: 5, acquisitionPercent: 50 },
];

export function parseQuantityFromName(name: string): number {
  const m = name.match(/x(\d+)$/i);
  return m ? Number.parseInt(m[1]!, 10) : 1;
}

function itemId(category: string, name: string): string {
  return `${category}::${name}`;
}

export const GACHA_ITEMS: GachaItem[] = RAW.map((row) => ({
  id: itemId(row.category, row.name),
  category: row.category,
  name: row.name,
  appearancePercent: row.appearancePercent,
  acquisitionPercent: row.acquisitionPercent,
  quantityPerHit: parseQuantityFromName(row.name),
  color: CATEGORY_COLORS[row.category] ?? '#94a3b8',
}));

export const CATEGORY_ORDER = [
  'ミシック傭兵',
  'レジェンド傭兵',
  'エピック傭兵',
  'レア傭兵',
  '戦闘経験書',
  '傭兵徽章',
  'コイン',
  'ダイヤ',
] as const;

/** 結果表示「計X個」（アイテム名の数値×獲得の合計＝ quantityTotals） */
export const DISPLAY_KEI_CATEGORIES = new Set<string>(['戦闘経験書', 'コイン', 'ダイヤ']);
