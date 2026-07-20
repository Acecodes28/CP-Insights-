import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { saveHandle } from "../../services/profileService";
import { getRankColorVar, formatRankLabel } from "../../utils/rankTier";

export default function ProfileHeader({ handle, userInfo, summary, source, isSaved, onSaved }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);

  const rankColorVar = getRankColorVar(summary.rank);

  async function handleSave() {
    setSaving(true);
    try {
      await saveHandle(handle);
      setSaved(true);
      onSaved?.();
    } catch {
      // no-op, saving is non-critical
    } finally {
      setSaving(false);
    }
  }

  const memberSince = userInfo.registrationTimeSeconds
    ? new Date(userInfo.registrationTimeSeconds * 1000).getFullYear()
    : null;

  return (
    <div className="masthead" style={{ "--card-accent": `var(${rankColorVar})` }}>
      <div className="masthead-top">
        <div className="masthead-identity">
          {userInfo.titlePhoto && (
            <img src={userInfo.titlePhoto} alt={handle} className="masthead-avatar" />
          )}

          <div className="masthead-titling">
            <span className="masthead-eyebrow">
              {formatRankLabel(summary.rank)}
              {memberSince && <span className="masthead-eyebrow-dot">·</span>}
              {memberSince && <span>on Codeforces since {memberSince}</span>}
            </span>
            <div className="masthead-name-row">
              <h1 className="masthead-name">{handle}</h1>
              {source === "cache" && <span className="masthead-source-badge">cached</span>}
            </div>
          </div>
        </div>

        {user && (
          <button className="masthead-save-btn" onClick={handleSave} disabled={saving || saved}>
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save handle"}
          </button>
        )}
      </div>

      <hr className="gold-rule masthead-rule" />

      <div className="masthead-stat-row">
        <div className="masthead-stat masthead-stat-hero">
          <span className="masthead-stat-value masthead-stat-value-hero">
            {summary.currentRating || "—"}
          </span>
          <span className="masthead-stat-label">Current rating</span>
        </div>
        <div className="masthead-stat">
          <span className="masthead-stat-value">{summary.maxRating || "—"}</span>
          <span className="masthead-stat-label">Peak rating</span>
        </div>
        <div className="masthead-stat">
          <span className="masthead-stat-value">{summary.totalSolved}</span>
          <span className="masthead-stat-label">Problems solved</span>
        </div>
        <div className="masthead-stat">
          <span className="masthead-stat-value">{userInfo.contribution ?? "—"}</span>
          <span className="masthead-stat-label">Contribution</span>
        </div>
      </div>
    </div>
  );
}
