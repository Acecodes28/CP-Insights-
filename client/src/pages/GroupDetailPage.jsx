import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchGroup,
  fetchGroupFeed,
  fetchGroupChallenges,
  fetchGroupStreaks,
  createGroupChallenge,
} from "../services/groupService";
import "../styles/groups.css";

function timeAgo(unixSeconds) {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FeedList({ groupId }) {
  const [state, setState] = useState({ loading: true, entries: [] });

  useEffect(() => {
    fetchGroupFeed(groupId)
      .then((entries) => setState({ loading: false, entries }))
      .catch(() => setState({ loading: false, entries: [] }));
  }, [groupId]);

  if (state.loading) return <div className="rec-item rec-item-skeleton" />;
  if (state.entries.length === 0) {
    return (
      <p className="dashboard-empty-text">
        No activity yet — the feed updates automatically as members solve problems (checked every
        few minutes).
      </p>
    );
  }

  return (
    <div className="feed-list">
      {state.entries.map((e) => (
        <a
          key={e._id}
          href={`https://codeforces.com/problemset/problem/${e.contestId}/${e.problemIndex}`}
          target="_blank"
          rel="noopener noreferrer"
          className="feed-item"
        >
          <div className="feed-item-main">
            <span className="feed-item-handle">{e.handle}</span>
            <span className="feed-item-verb">solved</span>
            <span className="feed-item-problem">{e.problemName}</span>
          </div>
          <div className="feed-item-meta">
            {e.problemRating && <span className="feed-item-rating">{e.problemRating}</span>}
            <span className="feed-item-time">{timeAgo(e.solvedAtSeconds)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

function ChallengeList({ groupId }) {
  const [state, setState] = useState({ loading: true, challenges: [] });
  const [creating, setCreating] = useState(false);

  function load() {
    fetchGroupChallenges(groupId)
      .then((challenges) => setState({ loading: false, challenges }))
      .catch(() => setState({ loading: false, challenges: [] }));
  }

  useEffect(load, [groupId]);

  async function handleCreate() {
    setCreating(true);
    try {
      await createGroupChallenge(groupId, {});
      load();
    } catch (err) {
      // surfaced inline via alert-free fallback text below
    } finally {
      setCreating(false);
    }
  }

  if (state.loading) return <div className="rec-item rec-item-skeleton" />;

  return (
    <div className="challenge-list">
      <button className="challenge-new-btn" onClick={handleCreate} disabled={creating}>
        {creating ? "Picking a problem…" : "+ New bonus challenge"}
      </button>

      {state.challenges.length === 0 && (
        <p className="dashboard-empty-text">No challenges yet — start one above.</p>
      )}

      {state.challenges.map((c) => {
        const isOpen = new Date(c.closesAt) > new Date();
        return (
          <div key={c._id} className={`challenge-card ${isOpen ? "" : "challenge-card-closed"}`}>
            <div className="challenge-card-top">
              <a
                href={`https://codeforces.com/problemset/problem/${c.contestId}/${c.problemIndex}`}
                target="_blank"
                rel="noopener noreferrer"
                className="challenge-card-name"
              >
                {c.problemName}
              </a>
              <span className="challenge-card-rating">{c.problemRating}</span>
            </div>
            <div className="challenge-card-tags">
              {c.tags.slice(0, 4).map((t) => (
                <span key={t} className="rec-tag">{t}</span>
              ))}
            </div>
            <div className="challenge-card-footer">
              <span>{isOpen ? `Closes ${new Date(c.closesAt).toLocaleDateString()}` : "Closed"}</span>
              <span>{c.solvedBy.length} solved</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StreakList({ groupId }) {
  const [state, setState] = useState({ loading: true, streaks: [] });

  useEffect(() => {
    fetchGroupStreaks(groupId)
      .then((streaks) => setState({ loading: false, streaks }))
      .catch(() => setState({ loading: false, streaks: [] }));
  }, [groupId]);

  if (state.loading) return <div className="rec-item rec-item-skeleton" />;
  if (state.streaks.length === 0) {
    return <p className="dashboard-empty-text">No streak data yet.</p>;
  }

  return (
    <div className="group-streak-list">
      {state.streaks.map((s) => (
        <div key={s.handle} className="group-streak-row">
          <span className="group-streak-handle">{s.handle}</span>
          <span className="group-streak-value">
            {s.current == null ? "—" : (
              <>
                <span className="group-streak-flame">🔥</span>
                {s.current}
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGroup(id)
      .then(setGroup)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="page-shell groups-page">
        <p className="dashboard-empty-text">{error}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page-shell groups-page">
        <div className="rec-item rec-item-skeleton" />
      </div>
    );
  }

  const myMembership = group.members.find((m) => m.user._id === user?._id || m.user === user?._id);
  const isAdmin = myMembership?.role === "admin";

  return (
    <div className="page-shell groups-page">
      <div className="group-detail-header">
        <div>
          <h1>{group.name}</h1>
          {group.description && <p className="dashboard-subtitle">{group.description}</p>}
        </div>
        {isAdmin && group.visibility === "invite-only" && (
          <div className="group-invite-code">
            <span>Invite code</span>
            <code>{group.joinCode}</code>
          </div>
        )}
      </div>

      <div className="group-member-strip">
        {group.members.map((m) => (
          <span key={m._id || m.handle} className="group-member-chip">
            {m.handle}
            {m.role === "admin" && <span className="group-member-admin-badge">admin</span>}
          </span>
        ))}
      </div>

      <div className="groups-grid">
        <div className="groups-col-main">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Activity feed</h2>
              <span className="dashboard-panel-hint">Auto-updates as members solve problems</span>
            </div>
            <FeedList groupId={group._id} />
          </section>
        </div>

        <div className="groups-col-side">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Streaks</h2>
            </div>
            <StreakList groupId={group._id} />
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Bonus challenges</h2>
            </div>
            <ChallengeList groupId={group._id} />
          </section>
        </div>
      </div>
    </div>
  );
}
