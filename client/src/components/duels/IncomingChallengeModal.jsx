import { useNavigate } from "react-router-dom";
import { useDuel } from "../../context/DuelContext";
import "../../styles/duels.css";

export default function IncomingChallengeModal() {
  const { incomingChallenge, acceptChallenge, declineChallenge } = useDuel();
  const navigate = useNavigate();

  if (!incomingChallenge) return null;

  const challengerHandle = incomingChallenge.players.find(
    (p) => p.user === incomingChallenge.challengerUser || p.user?._id === incomingChallenge.challengerUser
  )?.handle;

  function handleAccept() {
    acceptChallenge(incomingChallenge._id);
    navigate(`/duels/${incomingChallenge._id}`);
  }

  function handleDecline() {
    declineChallenge(incomingChallenge._id);
  }

  return (
    <div className="duel-challenge-overlay">
      <div className="duel-challenge-modal card">
        <span className="duel-challenge-eyebrow">Incoming challenge</span>
        <h3>{challengerHandle || "Someone"} wants to duel</h3>
        <p>
          Best of 3 · difficulty {incomingChallenge.difficultyMin}–{incomingChallenge.difficultyMax}
        </p>
        <div className="duel-challenge-actions">
          <button className="duel-decline-btn" onClick={handleDecline}>
            Decline
          </button>
          <button className="duel-accept-btn" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
