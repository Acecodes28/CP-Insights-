const axios = require("axios");
const Duel = require("../models/Duel");
const User = require("../models/User");
const { getProblemset } = require("./recommendationService");
const { computeEloUpdate } = require("./eloService");
const { evaluateBadgesForUser } = require("./badgeService");

const CF_BASE_URL = "https://codeforces.com/api";
const ROUNDS_TO_WIN = 2; // best-of-3
const ROUND_TIMEOUT_MS = 30 * 60 * 1000; // 30 min per round before it's declared a no-contest
const POLL_INTERVAL_MS = 8 * 1000; // how often the live poller checks CF for a round's resolution

// Problems already used in this duel are excluded from subsequent rounds -
// avoids the edge case where round 2 reoffers the same problem round 1 used.
function pickRoundProblem(problems, { min, max, excludeKeys }) {
  const candidates = problems.filter(
    (p) =>
      p.rating &&
      p.rating >= min &&
      p.rating <= max &&
      p.tags.length > 0 &&
      !excludeKeys.has(`${p.contestId}-${p.index}`)
  );
  if (candidates.length === 0) {
    // Widen the band once rather than failing outright - keeps a duel
    // alive even in a sparse rating range instead of erroring mid-match.
    const widened = problems.filter(
      (p) => p.rating && p.rating >= min - 200 && p.rating <= max + 200 && !excludeKeys.has(`${p.contestId}-${p.index}`)
    );
    if (widened.length === 0) throw new Error("No suitable problem found for this duel's difficulty range");
    return widened[Math.floor(Math.random() * widened.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function startRound(duel) {
  const problems = await getProblemset();
  const usedKeys = new Set(duel.rounds.map((r) => `${r.contestId}-${r.index}`));

  const min = duel.difficultyMin || 1200;
  const max = duel.difficultyMax || 1600;
  const problem = pickRoundProblem(problems, { min, max, excludeKeys: usedKeys });

  duel.rounds.push({
    contestId: problem.contestId,
    problemIndex: problem.index,
    problemName: problem.name,
    problemRating: problem.rating,
    tags: problem.tags,
    startedAt: new Date(),
    winnerHandle: null,
    resolvedAt: null,
    resolution: null,
  });

  await duel.save();
  return duel.rounds[duel.rounds.length - 1];
}

/**
 * Checks a single active duel's current round against live CF submissions
 * for both players. Returns { resolved: boolean, duel } - resolved=true
 * means the round (and possibly the match) just concluded, so the caller
 * (the poll loop in duelSocket.js) knows to broadcast an update.
 */
async function checkActiveRound(duel) {
  const currentRound = duel.rounds[duel.rounds.length - 1];
  if (!currentRound || currentRound.resolution) return { resolved: false, duel };

  const roundStartSeconds = Math.floor(currentRound.startedAt.getTime() / 1000);
  const timedOut = Date.now() - currentRound.startedAt.getTime() > ROUND_TIMEOUT_MS;

  let earliestSolve = null; // { handle, creationTimeSeconds }

  for (const player of duel.players) {
    try {
      const res = await axios.get(`${CF_BASE_URL}/user.status?handle=${player.handle}&from=1&count=50`);
      if (res.data.status !== "OK" || !Array.isArray(res.data.result)) continue;

      const qualifying = res.data.result.find(
        (s) =>
          s.verdict === "OK" &&
          s.problem.contestId === currentRound.contestId &&
          s.problem.index === currentRound.problemIndex &&
          s.creationTimeSeconds >= roundStartSeconds
      );

      if (qualifying) {
        if (!earliestSolve || qualifying.creationTimeSeconds < earliestSolve.creationTimeSeconds) {
          earliestSolve = { handle: player.handle, creationTimeSeconds: qualifying.creationTimeSeconds };
        }
      }
    } catch (err) {
      console.error(`Duel poll failed for ${player.handle}:`, err.message);
      // one player's CF hiccup shouldn't stall the whole duel's polling cycle
    }
  }

  if (!earliestSolve && !timedOut) {
    return { resolved: false, duel };
  }

  // Resolve the round - either someone solved it, or it timed out with no winner
  currentRound.resolvedAt = new Date();
  if (earliestSolve) {
    currentRound.winnerHandle = earliestSolve.handle;
    currentRound.resolution = "solved";
    const prevScore = duel.scores.get(earliestSolve.handle) || 0;
    duel.scores.set(earliestSolve.handle, prevScore + 1);
  } else {
    currentRound.resolution = "timeout";
  }

  const leadingScore = Math.max(...duel.players.map((p) => duel.scores.get(p.handle) || 0));

  if (leadingScore >= ROUNDS_TO_WIN) {
    duel.status = "completed";
    duel.completedAt = new Date();
    duel.winnerHandle = duel.players.find((p) => (duel.scores.get(p.handle) || 0) >= ROUNDS_TO_WIN)?.handle || null;
  } else if (duel.rounds.length >= 3) {
    // Best-of-3 exhausted without a 2-win leader (e.g. two timeouts +
    // one solve = 1-0 with no rounds left) - close it out as a draw
    // rather than starting a 4th round that breaks the "best of 3" promise.
    duel.status = "completed";
    duel.completedAt = new Date();
    duel.winnerHandle = null;
  }

  await duel.save();

  if (duel.status === "completed") {
    await applyDuelCompletion(duel);
  }

  if (duel.status === "active") {
    await startRound(duel);
  }

  return { resolved: true, duel };
}

/**
 * Applies Elo updates and win/loss/draw bookkeeping once a duel resolves.
 * Only ever called once per duel (guarded by the caller checking
 * duel.status === "completed" right after the transition), so there's no
 * risk of double-applying an Elo change if this function were somehow
 * invoked twice for the same match.
 */
async function applyDuelCompletion(duel) {
  if (duel.players.length !== 2) return; // Elo update assumes exactly 2 (1v1 only for now)

  const [p1, p2] = duel.players;
  const [user1, user2] = await Promise.all([User.findById(p1.user), User.findById(p2.user)]);
  if (!user1 || !user2) return;

  let scoreForP1;
  if (duel.winnerHandle === p1.handle) scoreForP1 = 1;
  else if (duel.winnerHandle === p2.handle) scoreForP1 = 0;
  else scoreForP1 = 0.5; // draw

  const { newRatingA, newRatingB } = computeEloUpdate(user1.elo, user2.elo, scoreForP1);
  user1.elo = newRatingA;
  user2.elo = newRatingB;

  if (scoreForP1 === 1) {
    user1.duelStats.wins += 1;
    user2.duelStats.losses += 1;
  } else if (scoreForP1 === 0) {
    user1.duelStats.losses += 1;
    user2.duelStats.wins += 1;
  } else {
    user1.duelStats.draws += 1;
    user2.duelStats.draws += 1;
  }

  await Promise.all([user1.save(), user2.save()]);

  // Badge evaluation runs after Elo/stats are saved, since several duel
  // badges (Giant Slayer, Hat Trick) depend on the just-updated numbers.
  // Failures here shouldn't roll back the duel result itself - a badge
  // miss is much lower stakes than the match outcome.
  evaluateBadgesForUser(user1._id).catch((err) => console.error("Badge eval failed:", err.message));
  evaluateBadgesForUser(user2._id).catch((err) => console.error("Badge eval failed:", err.message));
}

/**
 * One player forfeits the CURRENT round only. Resolves it as a loss for
 * the forfeiter (win for the other player) - same shape as a timeout
 * resolution, but with an explicit winner instead of nobody, and a
 * distinct resolution value so the round history can say "forfeited"
 * rather than implying neither player made it in time. Match continues
 * to the next round (or completes) exactly like any other round result.
 */
async function forfeitRound(duel, forfeitingHandle) {
  const currentRound = duel.rounds[duel.rounds.length - 1];
  if (!currentRound || currentRound.resolution) {
    throw new Error("No active round to forfeit");
  }

  const winner = duel.players.find((p) => p.handle !== forfeitingHandle);
  if (!winner) throw new Error("Could not determine round winner");

  currentRound.resolvedAt = new Date();
  currentRound.winnerHandle = winner.handle;
  currentRound.resolution = "forfeit";

  const prevScore = duel.scores.get(winner.handle) || 0;
  duel.scores.set(winner.handle, prevScore + 1);

  const leadingScore = Math.max(...duel.players.map((p) => duel.scores.get(p.handle) || 0));

  if (leadingScore >= ROUNDS_TO_WIN) {
    duel.status = "completed";
    duel.completedAt = new Date();
    duel.winnerHandle = winner.handle;
  } else if (duel.rounds.length >= 3) {
    duel.status = "completed";
    duel.completedAt = new Date();
    duel.winnerHandle = null;
  }

  await duel.save();

  if (duel.status === "completed") {
    await applyDuelCompletion(duel);
  }

  if (duel.status === "active") {
    await startRound(duel);
  }

  return duel;
}

/**
 * One player forfeits the ENTIRE match, regardless of current score. The
 * other player is declared the winner outright and Elo/stats are applied
 * as a normal completion - a forfeit counts as a loss, not a no-contest,
 * so quitting mid-match isn't a free way to avoid a rating hit.
 */
async function forfeitMatch(duel, forfeitingHandle) {
  if (duel.status !== "active") {
    throw new Error("This duel isn't active");
  }

  const winner = duel.players.find((p) => p.handle !== forfeitingHandle);
  if (!winner) throw new Error("Could not determine match winner");

  const currentRound = duel.rounds[duel.rounds.length - 1];
  if (currentRound && !currentRound.resolution) {
    currentRound.resolvedAt = new Date();
    currentRound.winnerHandle = winner.handle;
    currentRound.resolution = "forfeit";
  }

  duel.status = "completed";
  duel.completedAt = new Date();
  duel.winnerHandle = winner.handle;

  await duel.save();
  await applyDuelCompletion(duel);

  return duel;
}

async function createChallenge({ challengerUser, challengerHandle, challengerRating, opponentUser, opponentHandle, opponentRating, difficultyMin, difficultyMax }) {
  const duel = await Duel.create({
    status: "pending",
    source: "challenge",
    challengerUser,
    players: [
      { user: challengerUser, handle: challengerHandle, ratingAtStart: challengerRating },
      { user: opponentUser, handle: opponentHandle, ratingAtStart: opponentRating },
    ],
    difficultyMin,
    difficultyMax,
    scores: {},
  });
  return duel;
}

async function acceptChallenge(duel) {
  duel.status = "active";
  await duel.save();
  await startRound(duel);
  return duel;
}

async function createMatchmakingDuel(playerA, playerB) {
  const avg = Math.round(((playerA.rating || 1200) + (playerB.rating || 1200)) / 2);
  const duel = await Duel.create({
    status: "active",
    source: "matchmaking",
    players: [
      { user: playerA.userId, handle: playerA.handle, ratingAtStart: playerA.rating },
      { user: playerB.userId, handle: playerB.handle, ratingAtStart: playerB.rating },
    ],
    difficultyMin: avg - 150,
    difficultyMax: avg + 150,
    scores: {},
  });
  await startRound(duel);
  return duel;
}

module.exports = {
  startRound,
  checkActiveRound,
  createChallenge,
  acceptChallenge,
  createMatchmakingDuel,
  forfeitRound,
  forfeitMatch,
  ROUNDS_TO_WIN,
  ROUND_TIMEOUT_MS,
  POLL_INTERVAL_MS,
};
