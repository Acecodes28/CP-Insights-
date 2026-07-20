import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile, removeSavedHandle } from "../../services/profileService";
import { getRankColorVar, formatRankLabel } from "../../utils/rankTier";

export default function SavedHandleCard({ handle, onRemoved, isOwn }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchProfile(handle)
      .then((res) => {
        if (!cancelled) setSummary(res.data.summary);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  async function handleRemove(e) {
    e.stopPropagation();
    setRemoving(true);
    try {
      await removeSavedHandle(handle);
      onRemoved(handle);
    } catch {
      setRemoving(false);
    }
  }

  const rankColorVar = summary ? getRankColorVar(summary.rank) : "--rank-newbie";

  return (
    <div
      className="saved-handle-card card"
      style={{ "--card-accent": `var(${rankColorVar})` }}
      onClick={() => navigate(`/profile/${handle}`)}
    >
      <button
        className="saved-handle-remove"
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${handle}`}
        title="Remove"
      >
        ×
      </button>

      <span className="saved-handle-name mono">
        {handle}
        {isOwn && <span className="saved-handle-own-badge">You</span>}
      </span>

      {error && <span className="saved-handle-status saved-handle-status-error">Not found</span>}

      {!error && !summary && <span className="saved-handle-status">Loading…</span>}

      {summary && (
        <div className="saved-handle-stats">
          <span className="saved-handle-rating mono">{summary.currentRating || "—"}</span>
          <span className="saved-handle-rank">{formatRankLabel(summary.rank)}</span>
        </div>
      )}
    </div>
  );
}