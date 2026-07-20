import { useEffect, useState } from "react";
import { fetchUserBadges } from "../../services/badgeService";
import "../../styles/badges.css";

// Public view for someone else's profile - only ever shows unlocked
// badges (the API itself filters this server-side, this component never
// even receives locked ones), no progress bars, no "here's what you're
// missing" - just what they've actually earned.
export default function PublicBadgeShelf({ userId }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    if (!userId) return;
    fetchUserBadges(userId)
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }));
  }, [userId]);

  if (state.loading) return null;
  if (state.error || !state.data) return null;

  const { elo, badges } = state.data;
  if (badges.length === 0) return null;

  return (
    <div className="public-badge-shelf">
      <div className="public-elo-chip">
        <span>Elo</span>
        <strong>{elo}</strong>
      </div>
      <div className="public-badge-row">
        {badges.map((b) => (
          <div key={b.id} className="public-badge-chip" title={b.description}>
            🏅 {b.name}
          </div>
        ))}
      </div>
    </div>
  );
}
