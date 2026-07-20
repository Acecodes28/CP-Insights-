import { useEffect, useState } from "react";
import { fetchRecommendations } from "../../services/profileService";

export default function RecommendedProblems({ handle }) {
  const [state, setState] = useState({ loading: true, error: "", recommendations: [] });

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setState({ loading: true, error: "", recommendations: [] });

    fetchRecommendations(handle)
      .then((res) => {
        if (!cancelled) {
          setState({ loading: false, error: "", recommendations: res.recommendations });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, error: err.message, recommendations: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (state.loading) {
    return (
      <div className="rec-list">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rec-item rec-item-skeleton" />
        ))}
      </div>
    );
  }

  if (state.error) {
    return <p className="dashboard-empty-text">Couldn't load recommendations right now.</p>;
  }

  if (state.recommendations.length === 0) {
    return <p className="dashboard-empty-text">No recommendations yet — solve a few problems first.</p>;
  }

  return (
    <div className="rec-list">
      {state.recommendations.map((p) => (
        <a
          key={`${p.contestId}-${p.index}`}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rec-item"
        >
          <div className="rec-item-main">
            <span className="rec-item-name">{p.name}</span>
            <div className="rec-item-tags">
              {p.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={`rec-tag ${p.matchedWeakTags.includes(tag) ? "rec-tag-weak" : ""}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <span className="rec-item-rating">{p.rating}</span>
        </a>
      ))}
    </div>
  );
}
