import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDuel } from "../context/DuelContext";
import { fetchDuel } from "../services/duelService";
import "../styles/duels.css";

function RoundTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="duel-round-timer">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export default function DuelMatchPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { activeDuel, joinDuelRoom, onDuelUpdate, acceptChallenge, declineChallenge } = useDuel();
  const [duel, setDuel] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDuel(id)
      .then(setDuel)
      .catch((err) => setError(err.message));
    joinDuelRoom(id);
  }, [id]);

  useEffect(() => {
    const unsubscribe = onDuelUpdate((updated) => {
      if (updated._id === id) setDuel(updated);
    });
    return unsubscribe;
  }, [id, onDuelUpdate]);

  // The context's activeDuel can also carry updates (e.g. right after
  // accepting a challenge) - mirror it in if it matches this page's duel.
  useEffect(() => {
    if (activeDuel && activeDuel._id === id) setDuel(activeDuel);
  }, [activeDuel, id]);

  if (error) {
    return (
      <div className="page-shell duels-page">
        <p className="dashboard-empty-text">{error}</p>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="page-shell duels-page">
        <div className="rec-item rec-item-skeleton" />
      </div>
    );
  }

  const me = duel.players.find((p) => p.user === user._id || p.user?._id === user._id);
  const opponent = duel.players.find((p) => p !== me);
  const currentRound = duel.rounds[duel.rounds.length - 1];
  const myScore = duel.scores?.[me?.handle] || 0;
  const oppScore = duel.scores?.[opponent?.handle] || 0;

  if (duel.status === "pending") {
    const isChallenger = duel.challengerUser === user._id || duel.challengerUser?._id === user._id;
    return (
      <div className="page-shell duels-page">
        <div className="duel-match-shell card">
          <span className="duel-challenge-eyebrow">Challenge pending</span>
          <h2>
            {isChallenger ? `Waiting for ${opponent?.handle} to accept…` : `${opponent?.handle} challenged you`}
          </h2>
          {!isChallenger && (
            <div className="duel-challenge-actions">
              <button className="duel-decline-btn" onClick={() => declineChallenge(duel._id)}>
                Decline
              </button>
              <button className="duel-accept-btn" onClick={() => acceptChallenge(duel._id)}>
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (duel.status === "declined") {
    return (
      <div className="page-shell duels-page">
        <div className="duel-match-shell card">
          <h2>Challenge declined</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell duels-page">
      <div className="duel-match-shell card">
        <div className="duel-scoreboard">
          <div className={`duel-player ${duel.status === "completed" && duel.winnerHandle === me?.handle ? "duel-player-winner" : ""}`}>
            <span className="duel-player-handle">{me?.handle}</span>
            <span className="duel-player-score">{myScore}</span>
          </div>
          <span className="duel-vs">VS</span>
          <div className={`duel-player ${duel.status === "completed" && duel.winnerHandle === opponent?.handle ? "duel-player-winner" : ""}`}>
            <span className="duel-player-handle">{opponent?.handle}</span>
            <span className="duel-player-score">{oppScore}</span>
          </div>
        </div>

        {duel.status === "active" && currentRound && (
          <div className="duel-current-round">
            <div className="duel-round-header">
              <span>Round {duel.rounds.length}</span>
              <RoundTimer startedAt={currentRound.startedAt} />
            </div>
            <a
              href={`https://codeforces.com/problemset/problem/${currentRound.contestId}/${currentRound.problemIndex}`}
              target="_blank"
              rel="noopener noreferrer"
              className="duel-problem-link"
            >
              {currentRound.problemName}
              <span className="duel-problem-rating">{currentRound.problemRating}</span>
            </a>
            <div className="duel-problem-tags">
              {currentRound.tags.slice(0, 5).map((t) => (
                <span key={t} className="rec-tag">{t}</span>
              ))}
            </div>
            <p className="duel-round-hint">
              Solve it on Codeforces — first Accepted verdict wins the round. We're checking automatically.
            </p>
          </div>
        )}

        {duel.status === "completed" && (
          <div className="duel-result">
            <h2>
              {duel.winnerHandle
                ? duel.winnerHandle === me?.handle
                  ? "You won the match! 🏆"
                  : `${duel.winnerHandle} won the match`
                : "Match ended in a draw"}
            </h2>
          </div>
        )}

        <div className="duel-rounds-history">
          {duel.rounds.map((r, i) => (
            <div key={i} className="duel-round-row">
              <span>Round {i + 1}</span>
              <a
                href={`https://codeforces.com/problemset/problem/${r.contestId}/${r.problemIndex}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.problemName}
              </a>
              <span className="duel-round-outcome">
                {r.resolution === "solved" ? `${r.winnerHandle} won` : r.resolution === "timeout" ? "Timed out" : "In progress"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
