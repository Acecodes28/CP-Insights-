import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchSavedHandles } from "../services/profileService";
import HandleSearchBar from "../components/profile/HandleSearchBar";
import SavedHandleCard from "../components/profile/SavedHandleCard";
import RecommendedProblems from "../components/profile/RecommendedProblems";
import ContestTracker from "../components/profile/ContestTracker";
import StreakWidget from "../components/profile/StreakWidget";
import TrophyCabinet from "../components/badges/TrophyCabinet";
import LinkHandlePrompt from "../components/profile/LinkHandlePrompt";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const { user, linkHandle } = useAuth();
  const [savedHandles, setSavedHandles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedHandles()
      .then(setSavedHandles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleRemoved(handle) {
    setSavedHandles((prev) => prev.filter((h) => h.handle !== handle));
  }

  // Recommendations, streaks, and badges are always about YOUR account,
  // never whichever handle happens to be first/most-recent in the saved list.
  const primaryHandle = user?.primaryHandle;

  return (
    <div className="page-shell dashboard-page">
      <div className="dashboard-hero">
        <div>
          <h1>Welcome back, {user?.name}</h1>
          <p className="dashboard-subtitle">
            Your stats and recommendations{primaryHandle ? ` for ${primaryHandle}` : ""} below. Search or save
            other handles to check out their profiles.
          </p>
        </div>
        <HandleSearchBar autoFocus />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col-main">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Trophy cabinet</h2>
            </div>
            <TrophyCabinet />
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Saved handles</h2>
            </div>

            {loading && <p className="dashboard-empty-text">Loading…</p>}

            {!loading && savedHandles.length === 0 && (
              <p className="dashboard-empty-text">
                No saved handles yet — search one above and hit "Save handle" on its profile.
              </p>
            )}

            {!loading && savedHandles.length > 0 && (
              <div className="saved-handle-grid">
                {savedHandles.map((h) => (
                  <SavedHandleCard
                    key={h.handle}
                    handle={h.handle}
                    isOwn={primaryHandle && h.handle === primaryHandle}
                    onRemoved={handleRemoved}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Recommended for you</h2>
              {primaryHandle && (
                <span className="dashboard-panel-hint">Weak tags · rating gap · trending topics</span>
              )}
            </div>
            {primaryHandle ? (
              <RecommendedProblems handle={primaryHandle} />
            ) : (
              <LinkHandlePrompt
                message="Link your Codeforces handle to get personalized recommendations."
                onLinked={linkHandle}
              />
            )}
          </section>
        </div>

        <div className="dashboard-col-side">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Your streak</h2>
            </div>
            <StreakWidget />
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Contest tracker</h2>
            </div>
            <ContestTracker />
          </section>
        </div>
      </div>
    </div>
  );
}