import { useEffect, useState } from "react";
import { fetchActivityHeatmap } from "../../services/profileService";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Buckets a flat list of {date, count} days into week-columns, GitHub-heatmap
// style: each column is one week, each column has 7 cells (Sun-Sat). The
// first column is padded with nulls for days before the data actually starts,
// so the grid always aligns to real weekdays instead of just chunking by 7s.
function toWeekColumns(days) {
  if (days.length === 0) return [];

  const firstDate = new Date(days[0].date + "T00:00:00Z");
  const firstDayOfWeek = firstDate.getUTCDay(); // 0 = Sunday

  const padded = [...Array(firstDayOfWeek).fill(null), ...days];
  const columns = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }
  return columns;
}

function intensityClass(count, maxCount) {
  if (count === 0) return "heatmap-cell-0";
  const ratio = count / Math.max(1, maxCount);
  if (ratio > 0.75) return "heatmap-cell-4";
  if (ratio > 0.5) return "heatmap-cell-3";
  if (ratio > 0.25) return "heatmap-cell-2";
  return "heatmap-cell-1";
}

export default function ActivityHeatmap({ handle }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    fetchActivityHeatmap(handle)
      .then((data) => !cancelled && setState({ loading: false, error: "", data }))
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, data: null }));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (state.loading) {
    return <div className="rec-item rec-item-skeleton" style={{ height: 140 }} />;
  }

  if (state.error || !state.data) {
    return <p className="dashboard-empty-text">Couldn't load activity data right now.</p>;
  }

  const { days, totalActiveDays, maxCount } = state.data;
  const columns = toWeekColumns(days);

  // Month labels: mark the column where a new month's first week begins,
  // so labels don't repeat every single week.
  const monthMarkers = [];
  let lastMonth = null;
  columns.forEach((col, i) => {
    const firstRealDay = col.find((d) => d);
    if (!firstRealDay) return;
    const month = new Date(firstRealDay.date + "T00:00:00Z").getUTCMonth();
    if (month !== lastMonth) {
      monthMarkers.push({ colIndex: i, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-month-row">
        {monthMarkers.map((m) => (
          <span key={m.colIndex} className="heatmap-month-label" style={{ gridColumnStart: m.colIndex + 1 }}>
            {m.label}
          </span>
        ))}
      </div>

      <div className="heatmap-grid">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="heatmap-column">
            {col.map((day, rowIdx) =>
              day ? (
                <div
                  key={rowIdx}
                  className={`heatmap-cell ${intensityClass(day.count, maxCount)}`}
                  title={`${day.date}: ${day.count} solve${day.count !== 1 ? "s" : ""}`}
                />
              ) : (
                <div key={rowIdx} className="heatmap-cell heatmap-cell-empty" />
              )
            )}
          </div>
        ))}
      </div>

      <div className="heatmap-footer">
        <span>{totalActiveDays} active days in the last year</span>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-cell heatmap-cell-0" />
          <div className="heatmap-cell heatmap-cell-1" />
          <div className="heatmap-cell heatmap-cell-2" />
          <div className="heatmap-cell heatmap-cell-3" />
          <div className="heatmap-cell heatmap-cell-4" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
