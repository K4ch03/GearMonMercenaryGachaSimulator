import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';
import type { RarityStatRow, HistogramBin } from './stats';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

let countsChart: Chart | null = null;
let untilChart: Chart | null = null;

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
};

export function updateCountsChart(canvas: HTMLCanvasElement, rows: RarityStatRow[]) {
  const labels = rows.map((r) => r.name);
  const data = rows.map((r) => r.count);
  const colors = rows.map((r) => r.color);

  if (countsChart) countsChart.destroy();

  countsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '出現数',
          data,
          backgroundColor: colors.map((c) => c + 'cc'),
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
      },
    },
  });
}

export function updateUntilChart(canvas: HTMLCanvasElement, bins: HistogramBin[]) {
  const labels = bins.map((b) => b.label);
  const data = bins.map((b) => b.count);

  if (untilChart) untilChart.destroy();

  untilChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'セッション数',
          data,
          backgroundColor: '#38bdf8aa',
          borderColor: '#38bdf8',
          borderWidth: 1,
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        x: {
          ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 0 },
          grid: { display: false },
        },
      },
    },
  });
}

export function destroyCharts() {
  countsChart?.destroy();
  untilChart?.destroy();
  countsChart = null;
  untilChart = null;
}
