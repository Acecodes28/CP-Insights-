import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BUCKET_ORDER = [
  "800-1000",
  "1100-1300",
  "1400-1600",
  "1700-1900",
  "2000-2200",
  "2300-2500",
  "2600+",
];

export default function DifficultyChart({ difficultyBuckets }) {
  const buckets = difficultyBuckets || {};

  const hasData = BUCKET_ORDER.some((label) => buckets[label] > 0);

  if (!hasData) {
    return (
      <div className="chart-empty">
        <p>No solved problems with a known rating yet.</p>
      </div>
    );
  }

  const values = BUCKET_ORDER.map((label) => buckets[label] || 0);
  const maxVal = Math.max(...values);

  // Gold-to-ink intensity ramp: lighter gold for easier buckets, deepening
  // toward ink as difficulty climbs — reads as "harder = weightier", and
  // stays inside the site's two-color accent system instead of introducing
  // an unrelated hue scale.
  const colors = values.map((_, i) => {
    const t = i / (BUCKET_ORDER.length - 1);
    const r = Math.round(212 + t * (28 - 212));
    const g = Math.round(174 + t * (26 - 174));
    const b = Math.round(94 + t * (22 - 94));
    return `rgb(${r}, ${g}, ${b})`;
  });

  const data = {
    labels: BUCKET_ORDER,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B6252", font: { family: "JetBrains Mono", size: 10 } },
      },
      y: {
        beginAtZero: true,
        suggestedMax: maxVal + Math.ceil(maxVal * 0.15),
        grid: { color: "#E8E1D3" },
        ticks: { color: "#6B6252", stepSize: Math.max(1, Math.ceil(maxVal / 6)) },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1C1A16",
        borderColor: "#8C6420",
        borderWidth: 1,
        titleColor: "#F7F3EA",
        bodyColor: "#B8AF9C",
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (item) => `${item.raw} solved`,
        },
      },
    },
  };

  return (
    <div className="chart-canvas-wrap">
      <Bar data={data} options={options} />
    </div>
  );
}