import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProfile, fetchSavedHandles } from "../services/profileService";
import { lookupUserByHandle } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import ProfileHeader from "../components/profile/ProfileHeader";
import ActivityHeatmap from "../components/profile/ActivityHeatmap";
import RatingHistoryChart from "../components/profile/RatingHistoryChart";
import DifficultyChart from "../components/profile/DifficultyChart";
import TagStatsChart from "../components/profile/TagStatsChart";
import HandleSearchBar from "../components/profile/HandleSearchBar";
import RecommendedProblems from "../components/profile/RecommendedProblems";
import ContestTracker from "../components/profile/ContestTracker";
import PublicBadgeShelf from "../components/badges/PublicBadgeShelf";
import "../styles/profile.css";

export default function ProfilePage() {
  const { handle } = useParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [source, setSource] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [badgeOwnerId, setBadgeOwnerId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setProfile(null);
    setBadgeOwnerId(null);

    fetchProfile(handle)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
        setSource(res.source);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (user) {
      fetchSavedHandles()
        .then((handles) => {
          if (!cancelled) {
            setIsSaved(handles.some((h) => h.handle === handle.toLowerCase()));
          }
        })
        .catch(() => {});

      // Only relevant when logged in - resolves whether this handle
      // belongs to a CP Insights account at all, so the public badge
      // shelf only renders for handles that actually have one.
      lookupUserByHandle(handle).then((res) => {
        if (!cancelled && res) setBadgeOwnerId(res.userId);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [handle, user]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="profile-loading mono">Fetching {handle}…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="profile-error card">
          <h2>Couldn't load this handle</h2>
          <p>{error}</p>
          <Link to="/" className="profile-error-back">
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell profile-page">
      <div className="profile-search-row">
        <HandleSearchBar placeholder="Search another handle…" />
      </div>

      <ProfileHeader
        handle={handle}
        userInfo={profile.userInfo}
        summary={profile.summary}
        source={source}
        isSaved={isSaved}
        onSaved={() => setIsSaved(true)}
      />

      {badgeOwnerId && <PublicBadgeShelf userId={badgeOwnerId} />}

      <div className="profile-chart-section card">
        <h2>Activity</h2>
        <ActivityHeatmap handle={handle} />
      </div>

      <div className="profile-chart-section card">
        <h2>Rating history</h2>
        <RatingHistoryChart
          ratingHistory={profile.ratingHistory}
          currentRank={profile.summary.rank}
        />
      </div>

      <div className="profile-chart-grid">
        <div className="profile-chart-section card">
          <h2>Problems by difficulty</h2>
          <DifficultyChart difficultyBuckets={profile.difficultyBuckets} />
        </div>

        <div className="profile-chart-section card">
          <h2>Top tags</h2>
          <TagStatsChart tagStats={profile.tagStats} />
        </div>
      </div>

      <div className="profile-lower-grid">
        <div className="profile-chart-section card">
          <h2>Recommended problems</h2>
          <RecommendedProblems handle={handle} />
        </div>

        <div className="profile-chart-section card">
          <h2>Contest tracker</h2>
          <ContestTracker />
        </div>
      </div>
    </div>
  );
}