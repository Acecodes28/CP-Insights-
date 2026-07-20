import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const TOP_N = 10;

export default function TagStatsChart({ tagStats }) {
  const stats = tagStats || {};

  const entries = Object.entries(stats)
    .map(([tag, s]) => ({ tag, solved: s.solved || 0, attempted: s.attempted || 0 }))
    .filter((e) => e.solved + e.attempted > 0)
    .sort((a, b) => b.solved + b.attempted - (a.solved + a.attempted))
    .slice(0, TOP_N);

  if (entries.length === 0) {
    return (
      <div className="chart-empty">
        <p>No tagged submissions yet.</p>
      </div>
    );
  }

  const ordered = [...entries].reverse();

  const data = {
    labels: ordered.map((e) => e.tag),
    datasets: [
      {
        label: "Solved",
        data: ordered.map((e) => e.solved),
        backgroundColor: "#4C9F3B",
        borderRadius: 3,
        maxBarThickness: 16,
      },
      {
        label: "Attempted (unsolved)",
        data: ordered.map((e) => e.attempted),
        backgroundColor: "#D8CDB4",
        borderRadius: 3,
        maxBarThickness: 16,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#E8E1D3" },
        ticks: { color: "#6B6252", font: { family: "JetBrains Mono", size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#6B6252", font: { size: 11 } },
      },
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          color: "#6B6252",
          boxWidth: 12,
          boxHeight: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#1C1A16",
        borderColor: "#8C6420",
        borderWidth: 1,
        titleColor: "#F7F3EA",
        bodyColor: "#B8AF9C",
        padding: 10,
      },
    },
  };

  return (
    <div className="chart-canvas-wrap chart-canvas-wrap-tall">
      <Bar data={data} options={options} />
    </div>
  );
}