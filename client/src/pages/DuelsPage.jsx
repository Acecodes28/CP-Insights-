import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDuel } from "../context/DuelContext";
import { fetchMyDuels } from "../services/duelService";
import LinkHandlePrompt from "../components/profile/LinkHandlePrompt";
import "../styles/duels.css";

function ChallengeForm() {
  const { challenge, duelError } = useDuel();
  const navigate = useNavigate();
  const { activeDuel } = useDuel();
  const [handle, setHandle] = useState("");
  const [min, setMin] = useState(1200);
  const [max, setMax] = useState(1600);

  useEffect(() => {
    if (activeDuel && activeDuel.status === "pending") {
      navigate(`/duels/${activeDuel._id}`);
    }
  }, [activeDuel, navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!handle.trim()) return;
    challenge(handle.trim(), Number(min), Number(max));
  }

  return (
    <form onSubmit={handleSubmit} className="duel-challenge-form">
      <input
        type="text"
        placeholder="Rival's Codeforces handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
      />
      <div className="duel-difficulty-row">
        <label>
          Min
          <input type="number" value={min} onChange={(e) => setMin(e.target.value)} step={100} />
        </label>
        <label>
          Max
          <input type="number" value={max} onChange={(e) => setMax(e.target.value)} step={100} />
        </label>
      </div>
      <button type="submit" disabled={!handle.trim()}>
        Send challenge
      </button>
      {duelError && <p className="link-handle-error">{duelError}</p>}
    </form>
  );
}

function MatchmakingPanel() {
  const { queueStatus, joinQueue, leaveQueue, activeDuel } = useDuel();
  const navigate = useNavigate();
  const [min, setMin] = useState(800);
  const [max, setMax] = useState(3500);

  useEffect(() => {
    if (activeDuel && activeDuel.status === "active" && activeDuel.source === "matchmaking") {
      navigate(`/duels/${activeDuel._id}`);
    }
  }, [activeDuel, navigate]);

  if (queueStatus === "queued") {
    return (
      <div className="duel-queue-waiting">
        <div className="duel-queue-pulse" />
        <p>Looking for an opponent…</p>
        <button className="duel-decline-btn" onClick={leaveQueue}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="duel-queue-form">
      <div className="duel-difficulty-row">
        <label>
          Min rating
          <input type="number" value={min} onChange={(e) => setMin(e.target.value)} step={100} />
        </label>
        <label>
          Max rating
          <input type="number" value={max} onChange={(e) => setMax(e.target.value)} step={100} />
        </label>
      </div>
      <button onClick={() => joinQueue(Number(min), Number(max))}>Find a match</button>
    </div>
  );
}

function DuelHistoryList() {
  const [state, setState] = useState({ loading: true, duels: [] });
  const { user } = useAuth();

  useEffect(() => {
    fetchMyDuels()
      .then((duels) => setState({ loading: false, duels }))
      .catch(() => setState({ loading: false, duels: [] }));
  }, []);

  if (state.loading) return <div className="rec-item rec-item-skeleton" />;
  if (state.duels.length === 0) {
    return <p className="dashboard-empty-text">No duels yet — challenge a rival or find a match above.</p>;
  }

  return (
    <div className="duel-history-list">
      {state.duels.map((d) => {
        const me = d.players.find((p) => p.user === user._id || p.user?._id === user._id);
        const opponent = d.players.find((p) => p !== me);
        const won = d.winnerHandle && d.winnerHandle === me?.handle;
        const lost = d.winnerHandle && d.winnerHandle === opponent?.handle;

        return (
          <Link to={`/duels/${d._id}`} key={d._id} className="duel-history-item">
            <span className={`duel-history-status duel-history-${d.status}`}>
              {d.status === "completed"
                ? won
                  ? "Won"
                  : lost
                  ? "Lost"
                  : "Draw"
                : d.status}
            </span>
            <span className="duel-history-opponent">vs {opponent?.handle}</span>
            <span className="duel-history-score">
              {Object.values(d.scores || {}).join(" – ") || "–"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function DuelsPage() {
  const { user } = useAuth();

  if (!user?.primaryHandle) {
    return (
      <div className="page-shell duels-page">
        <h1>Duels</h1>
        <div className="card groups-link-card">
          <LinkHandlePrompt message="Link your Codeforces handle to challenge people to real-time duels." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell duels-page">
      <div className="groups-header">
        <div>
          <h1>Duels</h1>
          <p className="dashboard-subtitle">
            Best of 3. Same problem, same clock — first to get Accepted on Codeforces wins the round.
          </p>
        </div>
      </div>

      <div className="groups-grid">
        <div className="groups-col-main">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Duel history</h2>
            </div>
            <DuelHistoryList />
          </section>
        </div>

        <div className="groups-col-side">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Challenge a rival</h2>
            </div>
            <ChallengeForm />
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Quick match</h2>
            </div>
            <MatchmakingPanel />
          </section>
        </div>
      </div>
    </div>
  );
}
