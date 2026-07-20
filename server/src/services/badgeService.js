const axios = require("axios");
const User = require("../models/User");
const UserBadge = require("../models/UserBadge");
const Duel = require("../models/Duel");
const Streak = require("../models/Streak");
const { BADGE_CATALOG } = require("../data/badgeCatalog");

const CF_BASE_URL = "https://codeforces.com/api";

/**
 * Fetches and lightly processes a handle's submissions once per
 * evaluation run - every category below that needs submission data reads
 * from this same result instead of re-fetching, since user.status is the
 * single most expensive call in this whole evaluation.
 */
async function getSubmissionContext(handle) {
  const res = await axios.get(`${CF_BASE_URL}/user.status?handle=${handle}`);
  if (res.data.status !== "OK" || !Array.isArray(res.data.result)) {
    throw new Error("Could not load submissions from Codeforces");
  }
  return res.data.result; // newest first, per CF's API convention
}

// --- Category evaluators. Each returns { current, target, unlocked } ---

function evalSolveCount(submissions, target) {
  const solved = new Set();
  for (const s of submissions) {
    if (s.verdict === "OK") solved.add(`${s.problem.contestId}-${s.problem.index}`);
  }
  return { current: solved.size, target, unlocked: solved.size >= target };
}

function evalTagCount(submissions, tag, target) {
  const solved = new Set();
  for (const s of submissions) {
    if (s.verdict === "OK" && (s.problem.tags || []).includes(tag)) {
      solved.add(`${s.problem.contestId}-${s.problem.index}`);
    }
  }
  return { current: solved.size, target, unlocked: solved.size >= target };
}

function evalTagBreadth(submissions, perTagMin, tagCountTarget) {
  const solvedByTag = new Map(); // tag -> Set of problem keys
  const solvedKeysGlobal = new Set();

  for (const s of submissions) {
    if (s.verdict !== "OK") continue;
    const key = `${s.problem.contestId}-${s.problem.index}`;
    if (solvedKeysGlobal.has(key)) continue; // count each problem once per tag pass
    solvedKeysGlobal.add(key);
    for (const tag of s.problem.tags || []) {
      if (!solvedByTag.has(tag)) solvedByTag.set(tag, 0);
      solvedByTag.set(tag, solvedByTag.get(tag) + 1);
    }
  }

  const qualifyingTags = [...solvedByTag.values()].filter((count) => count >= perTagMin).length;
  return { current: qualifyingTags, target: tagCountTarget, unlocked: qualifyingTags >= tagCountTarget };
}

/**
 * Sub-5: needs each solved problem's submission time relative to its
 * CONTEST's start time. We only check submissions made during a contest's
 * live window (contestId present, submission type would ideally be
 * PRACTICE vs CONTESTANT but CF's API doesn't reliably expose that on
 * user.status), so this is a best-effort signal: "solved within 5 minutes
 * of the earliest submission timestamp we see for that contest," which
 * approximates "within 5 min of the round" without needing a separate
 * contest.status API call per contest (expensive at scale).
 */
function evalFastSolve(submissions) {
  const contestFirstSeen = new Map(); // contestId -> earliest submission timestamp seen

  // submissions are newest-first; process oldest-first for a true "first seen"
  const chronological = [...submissions].reverse();

  for (const s of chronological) {
    if (!contestFirstSeen.has(s.problem.contestId)) {
      contestFirstSeen.set(s.problem.contestId, s.creationTimeSeconds);
    }
  }

  let found = false;
  for (const s of chronological) {
    if (s.verdict !== "OK") continue;
    const contestStart = contestFirstSeen.get(s.problem.contestId);
    if (s.creationTimeSeconds - contestStart <= 5 * 60) {
      found = true;
      break;
    }
  }

  return { current: found ? 1 : 0, target: 1, unlocked: found };
}

/**
 * Flawless Contest: at least one contest where every problem the user
 * submitted to was eventually solved AND no submission for that contest
 * ever came back with a non-OK verdict (zero wrong submissions across
 * the whole contest, not just "eventually solved everything").
 */
function evalFlawlessContest(submissions) {
  const byContest = new Map(); // contestId -> { anyWrong: bool, sawSubmission: bool }

  for (const s of submissions) {
    if (!s.problem.contestId) continue;
    if (!byContest.has(s.problem.contestId)) {
      byContest.set(s.problem.contestId, { anyWrong: false });
    }
    const entry = byContest.get(s.problem.contestId);
    if (s.verdict !== "OK" && s.verdict !== "COMPILATION_ERROR" && s.verdict) {
      // Any non-OK judged verdict counts as "wrong" for this badge -
      // compilation errors are excluded since they're not a logic mistake,
      // just a typo, and CF communities generally don't count them as
      // breaking a "flawless" run the same way a wrong-answer does.
      if (s.verdict !== "TESTING" && s.verdict !== "SKIPPED") {
        entry.anyWrong = true;
      }
    }
  }

  const hasFlawless = [...byContest.values()].some((c) => !c.anyWrong);
  return { current: hasFlawless ? 1 : 0, target: 1, unlocked: hasFlawless };
}

/**
 * Sharpshooter: 10 contests where first-submission-per-problem accuracy
 * exceeds 90%. "First submission per problem" = the earliest submission
 * timestamp for that (contest, problem) pair.
 */
function evalAccuracyContests(submissions) {
  const chronological = [...submissions].reverse();
  const firstSubmissionPerProblem = new Map(); // "contestId-index" -> verdict

  for (const s of chronological) {
    const key = `${s.problem.contestId}-${s.problem.index}`;
    if (!firstSubmissionPerProblem.has(key)) {
      firstSubmissionPerProblem.set(key, { verdict: s.verdict, contestId: s.problem.contestId });
    }
  }

  const byContest = new Map(); // contestId -> { total, correct }
  for (const { verdict, contestId } of firstSubmissionPerProblem.values()) {
    if (!byContest.has(contestId)) byContest.set(contestId, { total: 0, correct: 0 });
    const entry = byContest.get(contestId);
    entry.total += 1;
    if (verdict === "OK") entry.correct += 1;
  }

  let qualifyingContests = 0;
  for (const { total, correct } of byContest.values()) {
    if (total > 0 && correct / total > 0.9) qualifyingContests += 1;
  }

  return { current: qualifyingContests, target: 10, unlocked: qualifyingContests >= 10 };
}

async function evalTierClimb(user) {
  if (!user.ratingBaseline?.capturedAt || !user.primaryHandle) {
    return { current: 0, target: 1, unlocked: false };
  }
  const res = await axios.get(`${CF_BASE_URL}/user.info?handles=${user.primaryHandle}`).catch(() => null);
  const cfUser = res?.data?.result?.[0];
  if (!cfUser) return { current: 0, target: 1, unlocked: false };

  const climbed = cfUser.rank && cfUser.rank !== user.ratingBaseline.rank;
  return { current: climbed ? 1 : 0, target: 1, unlocked: !!climbed };
}

async function evalPersonalBest(user) {
  if (!user.ratingBaseline?.capturedAt || !user.primaryHandle) {
    return { current: 0, target: 1, unlocked: false };
  }
  const res = await axios.get(`${CF_BASE_URL}/user.info?handles=${user.primaryHandle}`).catch(() => null);
  const cfUser = res?.data?.result?.[0];
  if (!cfUser) return { current: 0, target: 1, unlocked: false };

  const newPeak = (cfUser.maxRating || 0) > (user.ratingBaseline.rating || 0);
  return { current: newPeak ? 1 : 0, target: 1, unlocked: newPeak };
}

async function evalComeback(user) {
  if (!user.ratingBaseline?.capturedAt || !user.primaryHandle) {
    return { current: 0, target: 1, unlocked: false };
  }
  const res = await axios.get(`${CF_BASE_URL}/user.info?handles=${user.primaryHandle}`).catch(() => null);
  const cfUser = res?.data?.result?.[0];
  if (!cfUser) return { current: 0, target: 1, unlocked: false };

  const currentRating = cfUser.rating || 0;
  const lowest = user.lowestRatingSinceBaseline ?? user.ratingBaseline.rating;

  // Update the running low-water-mark as a side effect of evaluation -
  // this is the one evaluator that mutates user state beyond just reading it.
  if (currentRating < lowest) {
    user.lowestRatingSinceBaseline = currentRating;
    await user.save();
  }

  const realDip = user.ratingBaseline.rating - lowest >= 100; // meaningful dip, not noise
  const recovered = currentRating >= (cfUser.maxRating || 0) && currentRating > lowest;
  const unlocked = realDip && recovered;
  return { current: unlocked ? 1 : 0, target: 1, unlocked };
}

async function evalDuelWins(user) {
  const wins = user.duelStats?.wins || 0;
  return { current: Math.min(wins, 1), target: 1, unlocked: wins >= 1 };
}

async function evalDuelPlayedCount(user) {
  const played = (user.duelStats?.wins || 0) + (user.duelStats?.losses || 0) + (user.duelStats?.draws || 0);
  return { current: played, target: 25, unlocked: played >= 25 };
}

async function evalDuelWinStreak(user) {
  // Win streak isn't stored directly - derive it from recent completed
  // duels in chronological order, counting back from the most recent.
  const recentDuels = await Duel.find({ "players.user": user._id, status: "completed" })
    .sort({ completedAt: -1 })
    .limit(10);

  let streak = 0;
  for (const d of recentDuels) {
    const me = d.players.find((p) => p.user.toString() === user._id.toString());
    if (d.winnerHandle && d.winnerHandle === me?.handle) {
      streak += 1;
    } else {
      break; // streak is CONSECUTIVE from most recent - stop at first non-win
    }
  }

  return { current: Math.min(streak, 3), target: 3, unlocked: streak >= 3 };
}

async function evalDuelUpset(user) {
  const recentDuels = await Duel.find({ "players.user": user._id, status: "completed" }).limit(50);

  for (const d of recentDuels) {
    const me = d.players.find((p) => p.user.toString() === user._id.toString());
    const opponent = d.players.find((p) => p.user.toString() !== user._id.toString());
    if (!me || !opponent) continue;
    if (d.winnerHandle !== me.handle) continue;

    const eloGap = (opponent.ratingAtStart ?? 0) - (me.ratingAtStart ?? 0);
    if (eloGap >= 200) {
      return { current: 1, target: 1, unlocked: true };
    }
  }

  return { current: 0, target: 1, unlocked: false };
}

async function evalDuelPhotoFinish(user) {
  const recentDuels = await Duel.find({ "players.user": user._id, status: "completed" }).limit(50);

  for (const d of recentDuels) {
    const me = d.players.find((p) => p.user.toString() === user._id.toString());
    if (!me) continue;
    for (const round of d.rounds) {
      if (round.resolution !== "solved" || round.winnerHandle !== me.handle) continue;
      const secondsRemaining = 30 * 60 - (round.resolvedAt - round.startedAt) / 1000;
      if (secondsRemaining > 0 && secondsRemaining < 60) {
        return { current: 1, target: 1, unlocked: true };
      }
    }
  }

  return { current: 0, target: 1, unlocked: false };
}

async function evalStreakMilestone(user, target) {
  const streak = await Streak.findOne({ user: user._id });
  const longest = streak?.longest || 0;
  return { current: Math.min(longest, target), target, unlocked: longest >= target };
}

/**
 * Evaluates every badge in the catalog for a single user and upserts the
 * resulting progress/unlock state into UserBadge. This is the single
 * entry point everything else calls - after a duel, after a streak check,
 * or on-demand when someone views their own badge cabinet.
 */
async function evaluateBadgesForUser(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  let submissions = null;
  if (user.primaryHandle) {
    try {
      submissions = await getSubmissionContext(user.primaryHandle);
    } catch (err) {
      console.error(`Badge eval: could not fetch submissions for ${user.primaryHandle}:`, err.message);
    }
  }

  const results = [];

  for (const badge of BADGE_CATALOG) {
    let progress = { current: 0, target: badge.target, unlocked: false };

    try {
      if (submissions) {
        if (badge.category === "solve_count") progress = evalSolveCount(submissions, badge.target);
        else if (badge.category === "tag_count") progress = evalTagCount(submissions, badge.tag, badge.target);
        else if (badge.category === "tag_breadth") progress = evalTagBreadth(submissions, badge.perTagMin, badge.tagCountTarget);
        else if (badge.category === "fast_solve") progress = evalFastSolve(submissions);
        else if (badge.category === "flawless_contest") progress = evalFlawlessContest(submissions);
        else if (badge.category === "accuracy_contests") progress = evalAccuracyContests(submissions);
      }

      if (badge.category === "tier_climb") progress = await evalTierClimb(user);
      else if (badge.category === "personal_best") progress = await evalPersonalBest(user);
      else if (badge.category === "comeback") progress = await evalComeback(user);
      else if (badge.category === "duel_wins") progress = await evalDuelWins(user);
      else if (badge.category === "duel_win_streak") progress = await evalDuelWinStreak(user);
      else if (badge.category === "duel_upset") progress = await evalDuelUpset(user);
      else if (badge.category === "duel_played_count") progress = await evalDuelPlayedCount(user);
      else if (badge.category === "duel_photo_finish") progress = await evalDuelPhotoFinish(user);
      else if (badge.category === "streak_milestone") progress = await evalStreakMilestone(user, badge.target);
    } catch (err) {
      console.error(`Badge eval failed for ${badge.id}:`, err.message);
      continue; // skip this badge this run rather than failing the whole evaluation
    }

    const existing = await UserBadge.findOne({ user: userId, badgeId: badge.id });
    const wasUnlocked = existing?.unlocked || false;

    const updated = await UserBadge.findOneAndUpdate(
      { user: userId, badgeId: badge.id },
      {
        user: userId,
        badgeId: badge.id,
        unlocked: progress.unlocked,
        unlockedAt: progress.unlocked && !wasUnlocked ? new Date() : existing?.unlockedAt || null,
        progressCurrent: progress.current,
        progressTarget: progress.target,
      },
      { upsert: true, new: true }
    );

    results.push({ ...badge, ...updated.toObject() });
  }

  return results;
}

module.exports = { evaluateBadgesForUser, BADGE_CATALOG };
