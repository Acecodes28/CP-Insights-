import { useEffect, useState } from "react";
import { fetchMyBadges } from "../../services/badgeService";
import LinkHandlePrompt from "../profile/LinkHandlePrompt";
import "../../styles/badges.css";

const CATEGORY_GROUPS = [
  { label: "Solve Volume & Technique", categories: ["solve_count", "tag_count", "tag_breadth"] },
  { label: "Speed & Precision", categories: ["fast_solve", "flawless_contest", "accuracy_contests", "duel_photo_finish"] },
  { label: "Rating Progression", categories: ["tier_climb", "personal_best", "comeback"] },
  { label: "Duels", categories: ["duel_wins", "duel_win_streak", "duel_upset", "duel_played_count"] },
  { label: "Streaks", categories: ["streak_milestone"] },
];

function BadgeTile({ badge }) {
  const pct = Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100));

  return (
    <div className={`badge-tile ${badge.unlocked ? "badge-tile-unlocked" : "badge-tile-locked"}`}>
      <div className="badge-tile-icon">{badge.unlocked ? "🏅" : "🔒"}</div>
      <div className="badge-tile-body">
        <span className="badge-tile-name">{badge.name}</span>
        <span className="badge-tile-desc">{badge.description}</span>
        {!badge.unlocked && (
          <div className="badge-progress-row">
            <div className="badge-progress-track">
              <div className="badge-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="badge-progress-label">
              {badge.progressCurrent}/{badge.progressTarget}
            </span>
          </div>
        )}
        {badge.unlocked && badge.unlockedAt && (
          <span className="badge-tile-unlocked-date">
            Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TrophyCabinet() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    fetchMyBadges()
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }));
  }, []);

  if (state.loading) {
    return <div className="rec-item rec-item-skeleton" style={{ height: 200 }} />;
  }

  if (state.error === "Link your Codeforces handle to track badges") {
    return <LinkHandlePrompt message="Link your Codeforces handle to start tracking your Elo and badges." />;
  }

  if (state.error || !state.data) {
    return <p className="dashboard-empty-text">Couldn't load your trophy cabinet right now.</p>;
  }

  const { elo, duelStats, badges } = state.data;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="trophy-cabinet">
      <div className="elo-display">
        <div>
          <span className="elo-value">{elo}</span>
          <span className="elo-label">CP Insights Elo</span>
        </div>
        <div className="duel-stats-mini">
          <span><strong>{duelStats.wins}</strong> W</span>
          <span><strong>{duelStats.losses}</strong> L</span>
          <span><strong>{duelStats.draws}</strong> D</span>
        </div>
      </div>

      <div className="badge-cabinet-header">
        <span>{unlockedCount} / {badges.length} badges unlocked</span>
      </div>

      <div className="badge-groups">
        {CATEGORY_GROUPS.map((group) => {
          const groupBadges = badges.filter((b) => group.categories.includes(b.category));
          if (groupBadges.length === 0) return null;
          return (
            <div key={group.label} className="badge-group">
              <span className="badge-group-label">{group.label}</span>
              <div className="badge-grid">
                {groupBadges.map((b) => (
                  <BadgeTile key={b.badgeId || b.id} badge={b} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
