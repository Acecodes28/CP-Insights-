import { useEffect, useState } from "react";
import { fetchContests } from "../../services/profileService";

function formatCountdown(startTimeSeconds) {
  const diffMs = startTimeSeconds * 1000 - Date.now();
  if (diffMs <= 0) return "Starting now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDate(startTimeSeconds) {
  return new Date(startTimeSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ContestTracker() {
  const [state, setState] = useState({ loading: true, error: "", upcoming: [], recent: [] });
  const [, forceTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchContests()
      .then((res) => {
        if (!cancelled) {
          setState({ loading: false, error: "", upcoming: res.upcoming, recent: res.recent });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: err.message }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-render every 60s so countdowns stay roughly live without hammering
  // the component with a per-second timer for something that only needs
  // minute-level precision.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (state.loading) {
    return <div className="rec-item rec-item-skeleton" />;
  }

  if (state.error) {
    return <p className="dashboard-empty-text">Couldn't load the contest schedule right now.</p>;
  }

  if (state.upcoming.length === 0) {
    return <p className="dashboard-empty-text">No upcoming contests scheduled right now.</p>;
  }

  const [next, ...rest] = state.upcoming;

  return (
    <div className="contest-tracker">
      <a
        href={`https://codeforces.com/contests/${next.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="contest-next contest-next-link"
      >
        <span className="contest-next-eyebrow">Next contest</span>
        <h3 className="contest-next-name">{next.name}</h3>
        <div className="contest-next-meta">
          <span className="contest-countdown">{formatCountdown(next.startTimeSeconds)}</span>
          <span className="contest-next-date">{formatDate(next.startTimeSeconds)}</span>
          <span className="contest-next-duration">{formatDuration(next.durationSeconds)}</span>
        </div>
      </a>

      {rest.length > 0 && (
        <div className="contest-list">
          {rest.map((c) => (
            <a
              key={c.id}
              href={`https://codeforces.com/contests/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contest-list-item"
            >
              <span className="contest-list-name">{c.name}</span>
              <span className="contest-list-when">{formatDate(c.startTimeSeconds)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
