import './style.css';
import {
  defaultSimConfig,
  newRarityId,
  normalizedPercent,
  STORAGE_KEY,
  totalWeight,
  type Rarity,
  type SimConfig,
} from './config';
import type { WorkerOut, WorkerRunRequest } from './worker-types';
import { updateCountsChart, updateUntilChart } from './charts';

type Persisted = SimConfig & {
  pullCount: number;
  sessionCount: number;
  seedText: string;
};

const DEFAULT_PULLS = 10_000;
const DEFAULT_SESSIONS = 10_000;

function loadPersisted(): Persisted {
  const base = defaultSimConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...base,
        pullCount: DEFAULT_PULLS,
        sessionCount: DEFAULT_SESSIONS,
        seedText: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      rarities: parsed.rarities?.length ? parsed.rarities : base.rarities,
      targetRarityId: parsed.targetRarityId ?? base.targetRarityId,
      pullCount: parsed.pullCount ?? DEFAULT_PULLS,
      sessionCount: parsed.sessionCount ?? DEFAULT_SESSIONS,
      seedText: parsed.seedText ?? '',
    };
  } catch {
    return {
      ...base,
      pullCount: DEFAULT_PULLS,
      sessionCount: DEFAULT_SESSIONS,
      seedText: '',
    };
  }
}

function savePersisted(state: Persisted) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseSeed(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function formatNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ja-JP', { maximumFractionDigits: digits });
}

const state = loadPersisted();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header>
  <h1>ガチャシミュレーター</h1>
  <p>重みは相対値です（合計が 100 でなくても OK）。％表示は正規化した参考値です。</p>
</header>
<div class="layout layout-top">
  <section class="card" id="rarity-card">
    <h2>レアリティ</h2>
    <p class="hint">名前・色・重みを編集できます。</p>
    <div id="rarity-table-wrap"></div>
    <div class="toolbar">
      <button type="button" class="secondary" id="add-rarity">行を追加</button>
      <button type="button" class="secondary" id="reset-default">初期表に戻す</button>
    </div>
  </section>
  <section class="card">
    <h2>シミュレーション</h2>
    <div class="form-grid">
      <label>引く回数（出現数集計）
        <input type="number" id="pull-count" min="1" max="10000000" step="1" />
      </label>
      <label>セッション数（初登場まで）
        <input type="number" id="session-count" min="1" max="10000000" step="1" />
      </label>
      <label>集計対象レア（初登場まで）
        <select id="target-rarity"></select>
      </label>
      <label>シード（空欄でランダム）
        <input type="text" id="seed" inputmode="numeric" placeholder="例: 42" />
      </label>
    </div>
    <div class="toolbar" style="margin-top: 1rem">
      <button type="button" class="primary" id="run-sim">シミュレーション実行</button>
    </div>
    <div class="progress-wrap" id="progress-wrap" hidden>
      <span id="progress-label">計算中…</span>
      <div class="progress-bar"><div class="progress-bar-inner" id="progress-inner"></div></div>
    </div>
    <div class="toolbar">
      <button type="button" class="secondary" id="export-json">設定を JSON 出力</button>
      <button type="button" class="secondary" id="import-json">JSON 読み込み</button>
      <input type="file" accept="application/json,.json" class="hidden-input" id="import-file" />
    </div>
  </section>
</div>
<section class="card" style="margin-top: 1rem" id="results-card">
  <h2>結果</h2>
  <div id="results-body" class="results-empty">「シミュレーション実行」を押してください。</div>
</section>
`;

const rarityWrap = document.querySelector('#rarity-table-wrap')!;
const targetSelect = document.querySelector<HTMLSelectElement>('#target-rarity')!;
const pullCountInput = document.querySelector<HTMLInputElement>('#pull-count')!;
const sessionCountInput = document.querySelector<HTMLInputElement>('#session-count')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const runBtn = document.querySelector<HTMLButtonElement>('#run-sim')!;
const progressWrap = document.querySelector<HTMLDivElement>('#progress-wrap')!;
const progressLabel = document.querySelector('#progress-label')!;
const progressInner = document.querySelector<HTMLDivElement>('#progress-inner')!;
const resultsBody = document.querySelector('#results-body')!;

pullCountInput.value = String(state.pullCount);
sessionCountInput.value = String(state.sessionCount);
seedInput.value = state.seedText;

let worker: Worker | null = null;

function syncTargetOptions() {
  const prev = targetSelect.value;
  targetSelect.innerHTML = state.rarities
    .map(
      (r) =>
        `<option value="${escapeAttr(r.id)}" ${r.id === state.targetRarityId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`,
    )
    .join('');
  if (state.rarities.some((r) => r.id === prev)) {
    targetSelect.value = prev;
    state.targetRarityId = prev;
  } else if (state.rarities.length) {
    state.targetRarityId = state.rarities[0]!.id;
    targetSelect.value = state.targetRarityId;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function escapeAttr(s: string) {
  return escapeHtml(s);
}

function renderRarityTable() {
  const tw = totalWeight(state.rarities);
  rarityWrap.innerHTML = `
    <table class="rarity-table">
      <thead>
        <tr>
          <th>名前</th>
          <th>色</th>
          <th>重み</th>
          <th>参考％</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.rarities
          .map(
            (r, i) => `
          <tr data-index="${i}">
            <td><input type="text" data-field="name" value="${escapeAttr(r.name)}" /></td>
            <td><input type="color" data-field="color" value="${escapeAttr(r.color)}" /></td>
            <td><input type="number" data-field="weight" min="0" step="any" value="${r.weight}" /></td>
            <td class="pct">${formatNum(normalizedPercent(r.weight, tw), 2)}%</td>
            <td class="row-actions"><button type="button" data-action="remove" ${state.rarities.length <= 1 ? 'disabled' : ''}>削除</button></td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;

  rarityWrap.querySelectorAll('tbody tr').forEach((row) => {
    const idx = Number((row as HTMLElement).dataset.index);
    row.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        const field = (input as HTMLInputElement).dataset.field!;
        const r = state.rarities[idx]!;
        if (field === 'name') r.name = input.value.trim() || r.name;
        if (field === 'color') r.color = input.value;
        if (field === 'weight') r.weight = Math.max(0, Number(input.value) || 0);
        persistAndRender();
      });
    });
    row.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      if (state.rarities.length <= 1) return;
      const removed = state.rarities[idx]!.id;
      state.rarities.splice(idx, 1);
      if (state.targetRarityId === removed) {
        state.targetRarityId = state.rarities[0]!.id;
      }
      persistAndRender();
    });
  });
}

function persistAndRender() {
  savePersisted({
    ...state,
    pullCount: Number(pullCountInput.value) || DEFAULT_PULLS,
    sessionCount: Number(sessionCountInput.value) || DEFAULT_SESSIONS,
    seedText: seedInput.value,
  });
  syncTargetOptions();
  renderRarityTable();
}

function getPersistedFromInputs(): Persisted {
  return {
    rarities: state.rarities,
    targetRarityId: targetSelect.value || state.targetRarityId,
    pullCount: Math.max(1, Math.min(10_000_000, Number(pullCountInput.value) || DEFAULT_PULLS)),
    sessionCount: Math.max(
      1,
      Math.min(10_000_000, Number(sessionCountInput.value) || DEFAULT_SESSIONS),
    ),
    seedText: seedInput.value,
  };
}

document.querySelector('#add-rarity')!.addEventListener('click', () => {
  const id = newRarityId(state.rarities);
  state.rarities.push({ id, name: '新規', weight: 10, color: '#64748b' });
  persistAndRender();
});

document.querySelector('#reset-default')!.addEventListener('click', () => {
  const d = defaultSimConfig();
  state.rarities = d.rarities;
  state.targetRarityId = d.targetRarityId;
  persistAndRender();
});

targetSelect.addEventListener('change', () => {
  state.targetRarityId = targetSelect.value;
  savePersisted(getPersistedFromInputs());
});

[pullCountInput, sessionCountInput, seedInput].forEach((el) => {
  el.addEventListener('change', () => savePersisted(getPersistedFromInputs()));
});

function renderResults(result: Extract<WorkerOut, { type: 'result' }>) {
  const targetName =
    state.rarities.find((r) => r.id === state.targetRarityId)?.name ?? state.targetRarityId;
  const s = result.untilSummary;

  resultsBody.className = '';
  resultsBody.innerHTML = `
    <h3 style="margin:0 0 0.5rem;font-size:0.95rem">出現数（${formatNum(result.pullCount, 0)} 回引き）</h3>
    <table class="stats-table">
      <thead>
        <tr>
          <th>レア</th>
          <th>実数</th>
          <th>期待値</th>
          <th>差</th>
          <th>実％</th>
          <th>理論％</th>
        </tr>
      </thead>
      <tbody>
        ${result.rarityStats
          .map(
            (row) => `
          <tr>
            <td><span style="color:${row.color}">■</span> ${escapeHtml(row.name)}</td>
            <td>${formatNum(row.count, 0)}</td>
            <td>${formatNum(row.expected, 1)}</td>
            <td>${row.diff >= 0 ? '+' : ''}${formatNum(row.diff, 1)}</td>
            <td>${formatNum(row.actualPercent, 3)}%</td>
            <td>${formatNum(row.theoryPercent, 3)}%</td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <div class="chart-box" style="margin-top:1rem"><canvas id="chart-counts"></canvas></div>

    <h3 style="margin:1.25rem 0 0.5rem;font-size:0.95rem">「${escapeHtml(targetName)}」が初めて出るまで（${formatNum(s.count, 0)} セッション）</h3>
    <div class="summary-pills">
      <span class="pill">平均 <strong>${formatNum(s.mean, 2)}</strong> 回</span>
      <span class="pill">中央値 <strong>${formatNum(s.median, 0)}</strong> 回</span>
      <span class="pill">90%tile <strong>${formatNum(s.p90, 0)}</strong> 回</span>
      <span class="pill">最小 <strong>${formatNum(s.min, 0)}</strong></span>
      <span class="pill">最大 <strong>${formatNum(s.max, 0)}</strong></span>
    </div>
    <div class="chart-box"><canvas id="chart-until"></canvas></div>
  `;

  const countsCanvas = document.querySelector<HTMLCanvasElement>('#chart-counts')!;
  const untilCanvas = document.querySelector<HTMLCanvasElement>('#chart-until')!;
  updateCountsChart(countsCanvas, result.rarityStats);
  updateUntilChart(untilCanvas, result.untilHistogram);
}

function setRunning(running: boolean) {
  runBtn.disabled = running;
  progressWrap.hidden = !running;
  if (!running) {
    progressInner.style.width = '0%';
  }
}

function runSimulation() {
  const p = getPersistedFromInputs();
  state.rarities = p.rarities;
  state.targetRarityId = p.targetRarityId;
  savePersisted(p);

  if (totalWeight(state.rarities) <= 0) {
    alert('重みの合計が 0 です。いずれかの重みを正の値にしてください。');
    return;
  }

  worker?.terminate();
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  setRunning(true);
  progressLabel.textContent = '準備中…';
  progressInner.style.width = '0%';

  const req: WorkerRunRequest = {
    type: 'run',
    rarities: state.rarities.map((r) => ({ ...r })),
    targetRarityId: state.targetRarityId,
    pullCount: p.pullCount,
    sessionCount: p.sessionCount,
    seed: parseSeed(p.seedText),
    progressEvery: Math.max(500, Math.floor(p.pullCount / 200)),
  };

  worker.onmessage = (ev: MessageEvent<WorkerOut>) => {
    const data = ev.data;
    if (data.type === 'progress') {
      const label =
        data.phase === 'pulls'
          ? `出現数集計: ${data.done.toLocaleString()} / ${data.total.toLocaleString()}`
          : `初登場分布: ${data.done.toLocaleString()} / ${data.total.toLocaleString()}`;
      progressLabel.textContent = label;
      const pct = data.total > 0 ? (data.done / data.total) * 100 : 0;
      const overall = data.phase === 'sessions' ? 50 + pct / 2 : pct / 2;
      progressInner.style.width = `${overall}%`;
    } else if (data.type === 'result') {
      setRunning(false);
      renderResults(data);
      worker?.terminate();
      worker = null;
    } else if (data.type === 'error') {
      setRunning(false);
      alert(data.message);
      worker?.terminate();
      worker = null;
    }
  };

  worker.onerror = () => {
    setRunning(false);
    alert('ワーカーでエラーが発生しました。');
    worker?.terminate();
    worker = null;
  };

  worker.postMessage(req);
}

runBtn.addEventListener('click', runSimulation);

document.querySelector('#export-json')!.addEventListener('click', () => {
  const p = getPersistedFromInputs();
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gacha-sim-config.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

const importFile = document.querySelector<HTMLInputElement>('#import-file')!;
document.querySelector('#import-json')!.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<Persisted>;
    if (!parsed.rarities?.length) throw new Error('rarities が空です');
    state.rarities = parsed.rarities;
    state.targetRarityId =
      parsed.targetRarityId && parsed.rarities.some((r) => r.id === parsed.targetRarityId)
        ? parsed.targetRarityId
        : parsed.rarities[0]!.id;
    pullCountInput.value = String(parsed.pullCount ?? DEFAULT_PULLS);
    sessionCountInput.value = String(parsed.sessionCount ?? DEFAULT_SESSIONS);
    seedInput.value = parsed.seedText ?? '';
    persistAndRender();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'JSON の読み込みに失敗しました');
  }
});

syncTargetOptions();
renderRarityTable();
