# ガチャシミュレーター

汎用の重み付きガチャを、ブラウザ上で大量に引いて統計を確認するツールです。

- レアリティ（名前・色・重み）を自由に編集
- 指定回数の **出現数** と理論期待値の比較
- 指定レアが **初めて出るまでの引数** の分布（平均・中央値・90% タイル・ヒストグラム）
- 設定の localStorage 保存、JSON インポート／エクスポート
- シード指定で再現可能な乱数（空欄なら `Math.random`）

重みは **相対値** です。合計が 100 でなくても、比率どおりに抽選されます。

## 必要環境

- [Node.js](https://nodejs.org/) LTS（20 推奨）

## ローカルで動かす

```bash
cd gacha-sim
npm install
npm run dev
```

表示された URL（通常 `http://localhost:5173`）をブラウザで開きます。

本番ビルド:

```bash
npm run build
npm run preview
```

## 公開する

### Vercel（手順が短い）

1. このフォルダ（または mono-repo なら Root Directory に `gacha-sim`）を GitHub に push
2. [Vercel](https://vercel.com) で GitHub 連携 → プロジェクト追加
3. **Framework**: Vite / **Build**: `npm run build` / **Output**: `dist`
4. デプロイ後の `https://<project>.vercel.app` が公開 URL

`vite.config.ts` の `base` は **`/` のまま**（変更不要）。

### GitHub Pages

**このフォルダだけ**を GitHub リポジトリのルートにした場合:

1. GitHub → **Settings → Pages** → Source を **GitHub Actions**
2. [`gacha-sim/.github/workflows/pages.yml`](.github/workflows/pages.yml) が `main` への push でデプロイ

**CursorRepo 全体（mono-repo）** を push する場合:

1. リポジトリルートの [`.github/workflows/gacha-sim-pages.yml`](../.github/workflows/gacha-sim-pages.yml) を使用
2. 公開 URL の例: `https://<user>.github.io/<repo>/gacha-sim/`（repo 名により path は異なります）

GitHub Actions では `VITE_BASE=/<リポジトリ名>/` を渡してビルドします（[`vite.config.ts`](vite.config.ts) の `base`）。  
リポジトリ名と Pages の URL が一致している必要があります。

### 公開前チェック

- `node_modules` と `.env` を commit しない（`.gitignore` 済み）
- 初回 Pages デプロイ前に `npm run build` がローカルで通ることを確認

## 使い方

1. 左の表でレアと重みを編集
2. 右で「引く回数」「セッション数」「初登場を見るレア」を指定
3. **シミュレーション実行**
4. 結果表と Chart.js のグラフを確認

## 技術

- Vite + TypeScript
- Web Worker（大量シミュレーション）
- Chart.js
