import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { resolveRankColor, formatRankLabel } from "../../utils/rankTier";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Filler, Tooltip);

function rankForRating(rating) {
  if (rating >= 3000) return "legendary grandmaster";
  if (rating >= 2600) return "grandmaster";
  if (rating >= 2400) return "international grandmaster";
  if (rating >= 2300) return "master";
  if (rating >= 1900) return "candidate master";
  if (rating >= 1600) return "expert";
  if (rating >= 1400) return "specialist";
  if (rating >= 1200) return "pupil";
  return "newbie";
}

export default function RatingHistoryChart({ ratingHistory, currentRank }) {
  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <div className="chart-empty">
        <p>No rated contests yet.</p>
      </div>
    );
  }

  const sorted = [...ratingHistory].sort(
    (a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
  );

  const points = sorted.map((entry) => ({
    x: entry.ratingUpdateTimeSeconds * 1000,
    y: entry.newRating,
  }));

  const pointColors = sorted.map((entry) => resolveRankColor(rankForRating(entry.newRating)));
  const lineColor = resolveRankColor(currentRank);

  const data = {
    datasets: [
      {
        data: points,
        borderColor: lineColor,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return "transparent";
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `${lineColor}33`);
          gradient.addColorStop(1, `${lineColor}00`);
          return gradient;
        },
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: pointColors,
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 1.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        type: "time",
        time: { unit: "month" },
        grid: { color: "#E8E1D3" },
        ticks: { color: "#6B6252", font: { family: "JetBrains Mono", size: 11 } },
      },
      y: {
        grid: { color: "#E8E1D3" },
        ticks: { color: "#6B6252", font: { family: "JetBrains Mono", size: 11 } },
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
        titleFont: { family: "Inter", weight: "600" },
        bodyFont: { family: "JetBrains Mono", size: 12 },
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex;
            return sorted[idx].contestName;
          },
          label: (item) => {
            const idx = item.dataIndex;
            const entry = sorted[idx];
            const delta = entry.newRating - entry.oldRating;
            const sign = delta >= 0 ? "+" : "";
            return [
              `Rating: ${entry.newRating} (${sign}${delta})`,
              `Rank: #${entry.rank}`,
              formatRankLabel(rankForRating(entry.newRating)),
            ];
          },
        },
      },
    },
  };

  return (
    <div className="chart-canvas-wrap">
      <Line data={data} options={options} />
    </div>
  );
}