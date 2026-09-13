import './style.css';

import {

  buildResultLines,

  DEFAULT_FREE_EXTRA,

  DEFAULT_ORBS,

  ORBS_PER_GACHA,

  orbsCostPerGacha,

  type GachaDetailLog,

  type ResultLine,

  type SimResult,

  type TransferMultiplier,

} from './engine';

import type { WorkerRequest, WorkerResponse } from './worker-types';
import { GACHA_ITEMS } from './data/catalog';



const STORAGE_KEY = 'transfer-sim-v4';



function loadOrbs(): number {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return DEFAULT_ORBS;

    const p = JSON.parse(raw) as { orbs?: number };

    return p.orbs ?? DEFAULT_ORBS;

  } catch {

    return DEFAULT_ORBS;

  }

}



function saveOrbs(orbs: number) {

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ orbs }));

}



function formatNum(n: number): string {

  return n.toLocaleString('ja-JP');

}



function escapeHtml(s: string): string {

  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

}



function formatResultValue(line: ResultLine): string {

  if (line.stackSuffix) {

    return `${formatNum(line.hitCount)} (${formatNum(line.totalValue)}${line.stackSuffix})`;

  }

  return formatNum(line.totalValue);

}

function formatRatePercent(p: number): string {
  const text = p.toFixed(4).replace(/\.?0+$/, '');
  return `${text}%`;
}

function buildProbabilityTableRows(): string {
  return GACHA_ITEMS.map(
    (item) => `
    <tr>
      <td><span class="cat-badge table-cat" style="background:${item.color}22;border-color:${item.color};color:${item.color}">${escapeHtml(item.category)}</span></td>
      <td>${escapeHtml(item.name)}</td>
      <td class="num">${formatRatePercent(item.appearancePercent)}</td>
      <td class="num">${formatRatePercent(item.acquisitionPercent)}</td>
    </tr>`,
  ).join('');
}



const savedOrbs = loadOrbs();

const app = document.querySelector<HTMLDivElement>('#app')!;



app.innerHTML = `

<header>

  <h1>ギアモン傭兵ガチャシミュレーター</h1>

</header>

<section class="card">

  <h2>設定</h2>

  <div class="form-grid">

    <label>消費する転送神珠数

      <input type="number" id="orbs" min="0" step="1" value="${savedOrbs}" />

    </label>

  </div>

  <p class="hint orb-cost">1回のガチャ消費: 1倍 ${ORBS_PER_GACHA} 個 / 10倍 ${ORBS_PER_GACHA * 10} 個</p>

  <div class="toolbar sim-buttons">

    <button type="button" class="primary" data-mult="1">1倍転送シミュレーション実行</button>

    <button type="button" class="primary" data-mult="10">10倍転送シミュレーション実行</button>

  </div>

</section>

<section class="card" id="log-card" hidden>

  <h2>抽選ログ</h2>

  <p class="hint">ガチャが1回だけ実行されるときのみ表示します（1倍 ${ORBS_PER_GACHA} 個 / 10倍 ${ORBS_PER_GACHA * 10} 個）。</p>

  <div id="log-body"></div>

</section>

<section class="card" id="results-card">

  <h2>結果</h2>

  <div id="results-summary" class="results-summary" hidden></div>

  <div id="results-body" class="results-empty">上のボタンでシミュレーションを実行してください。</div>

</section>

<section class="card" id="rates-card">
  <h2>確率表</h2>
  <div class="table-wrap">
    <table class="rates-table">
      <thead>
        <tr>
          <th>カテゴリ</th>
          <th>アイテム名</th>
          <th>出現確率</th>
          <th>獲得確率</th>
        </tr>
      </thead>
      <tbody>
        ${buildProbabilityTableRows()}
      </tbody>
    </table>
  </div>
</section>

`;



const orbsInput = document.querySelector<HTMLInputElement>('#orbs')!;

const resultsBody = document.querySelector('#results-body')!;

const resultsSummary = document.querySelector<HTMLDivElement>('#results-summary')!;

const logCard = document.querySelector<HTMLDivElement>('#log-card')!;

const logBody = document.querySelector('#log-body')!;



function readOrbs(): number {

  return Math.max(0, Math.floor(Number(orbsInput.value) || 0));

}



orbsInput.addEventListener('change', () => saveOrbs(readOrbs()));



let worker: Worker | null = null;



function setRunning(running: boolean) {

  document.querySelectorAll<HTMLButtonElement>('.sim-buttons button').forEach((b) => {

    b.disabled = running;

  });

}



function renderDetailLog(detailLog: GachaDetailLog | undefined) {

  if (!detailLog?.segments.length) {

    logCard.hidden = true;

    logBody.innerHTML = '';

    return;

  }



  logCard.hidden = false;

  logBody.innerHTML = detailLog.segments

    .map(

      (seg) => `

    <div class="log-segment">

      <h3 class="log-segment-title">${escapeHtml(seg.title)}</h3>

      <ol class="pick-log">

        ${seg.entries

          .map(

            (e, i) => `

          <li class="pick-log-row">

            <span class="pick-idx">${i + 1}</span>

            <span class="cat-badge" style="background:${e.color}22;border-color:${e.color};color:${e.color}">${escapeHtml(e.category)}</span>

            <span class="pick-name">${escapeHtml(e.itemName)}</span>

            <span class="pick-result ${e.acquired ? 'ok' : 'ng'}">${e.acquired ? '獲得成功' : '獲得失敗'}</span>

          </li>`,

          )

          .join('')}

      </ol>

    </div>`,

    )

    .join('');

}



function renderResults(result: SimResult, multiplier: TransferMultiplier) {

  const lines = buildResultLines(result);



  resultsSummary.hidden = false;

  resultsSummary.innerHTML = `

    <p class="results-summary-line">${multiplier}倍転送 × ${formatNum(result.gachaCount)} 回（転送神珠 ${formatNum(result.orbsUsed)} 消費）</p>

    <p class="results-summary-line">追加転送回数の合計: <strong>${formatNum(result.freeTransferCount)}</strong> 回</p>

  `;



  renderDetailLog(result.detailLog);



  if (lines.length === 0) {

    resultsBody.className = 'results-empty';

    resultsBody.textContent = '獲得したアイテムはありませんでした。';

    return;

  }



  resultsBody.className = 'result-lines';

  resultsBody.innerHTML = lines

    .map(

      (line) => `

    <div class="result-line">

      <span class="cat-badge" style="background:${line.item.color}22;border-color:${line.item.color};color:${line.item.color}">${escapeHtml(line.item.category)}</span>

      <span class="item-name">${escapeHtml(line.item.name)}</span>

      <span class="item-total">${formatResultValue(line)}</span>

    </div>`,

    )

    .join('');

}



function runSim(multiplier: TransferMultiplier) {

  const orbs = readOrbs();

  saveOrbs(orbs);



  const cost = orbsCostPerGacha(multiplier);

  if (orbs < cost) {

    alert(`転送神珠が不足しています（${multiplier}倍転送1回には ${cost} 個必要です）。`);

    return;

  }



  worker?.terminate();

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  setRunning(true);

  resultsSummary.hidden = true;

  resultsBody.className = 'results-empty';

  resultsBody.textContent = '計算中…';

  logCard.hidden = true;



  const req: WorkerRequest = {

    type: 'simulate',

    orbsToSpend: orbs,

    maxFreeExtraDraws: DEFAULT_FREE_EXTRA,

    multiplier,

  };



  worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {

    const data = ev.data;

    if (data.type === 'result') {

      setRunning(false);

      renderResults(

        {

          quantityTotals: data.quantityTotals,

          hitTotals: data.hitTotals,

          gachaCount: data.gachaCount,

          orbsUsed: data.orbsUsed,

          freeTransferCount: data.freeTransferCount,

          detailLog: data.detailLog,

        },

        multiplier,

      );

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

    alert('計算中にエラーが発生しました。');

    worker?.terminate();

    worker = null;

  };



  worker.postMessage(req);

}



document.querySelectorAll<HTMLButtonElement>('.sim-buttons button').forEach((btn) => {

  btn.addEventListener('click', () => {

    const mult = Number(btn.dataset.mult) as TransferMultiplier;

    runSim(mult);

  });

});


