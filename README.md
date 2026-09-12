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

### Vercel — 専用リポジトリ（推奨：gacha-sim だけ公開）

**GitHub のリポジトリ直下**に、このフォルダの中身だけを置きます（`package.json` がルート）。  
CursorRepo 全体や Python プロジェクトは **含めません**。

#### 1. ローカルでビルド確認

```powershell
cd C:\CursorRepo\gacha-sim
npm install
npm run build
```

#### 2. 専用 GitHub リポジトリへ push

GitHub で空リポジトリ（例: `gacha-sim`）を作成してから:

```powershell
cd C:\CursorRepo\gacha-sim
git init -b main
git add -A
git commit -m "Initial commit: gacha simulator"
git remote add origin https://github.com/<ユーザー名>/gacha-sim.git
git push -u origin main
```

`CursorRepo` 全体がすでに別の git リポの場合は、**このフォルダだけ**別途 `git init` するか、サブフォルダ用の push 手順を使い、リモートを混同しないようにしてください。

#### 3. Vercel ダッシュボード設定チェックリスト

| 項目 | 値 |
|------|-----|
| Import する repo | 上記 **gacha-sim 専用** repo |
| Root Directory | **空**（`.` = リポジトリルート） |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install`（デフォルト） |
| 環境変数 | **不要**（`VITE_BASE` は GitHub Pages 用のみ） |

[`vercel.json`](vercel.json) があるため、Vercel が上記を自動認識することもあります。

#### 4. 公開 URL

デプロイ成功後: `https://<project-name>.vercel.app`  
以降は `main` へ push するたびに自動再デプロイされます。

`vite.config.ts` の `base` は **`/` のまま**（Vercel では変更不要）。

Cursor の Vercel プラグインを使う場合: このフォルダをワークスペースルートに開き **`/deploy`**（プレビュー）または **`/deploy production`**（本番）。

---

### Vercel — mono-repo（CursorRepo 全体を 1 repo にする場合）

1. CursorRepo 全体を GitHub に push
2. Vercel で Import → **Root Directory** に `gacha-sim` を指定
3. それ以外は上記チェックリストと同じ（Build / Output / Framework）

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
