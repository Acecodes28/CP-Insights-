const axios = require("axios");
const ProblemsetCache = require("../models/ProblemsetCache");

const CF_BASE_URL = "https://codeforces.com/api";
const PROBLEMSET_TTL_HOURS = 24;
const RECENT_CONTEST_SAMPLE = 8; // how many recent finished contests feed the trend signal

/**
 * Read-through cache for the full CF problemset. This is shared across every
 * user (the problemset itself doesn't depend on who's asking), so we cache
 * it once in Mongo instead of re-fetching ~9000 problems per recommendation
 * request. This is the main lever that keeps the endpoint fast: without it,
 * every dashboard load would cost a multi-second CF API round trip.
 */
async function getProblemset() {
  const cached = await ProblemsetCache.findOne({ key: "problemset" });
  const isFresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < PROBLEMSET_TTL_HOURS * 3600 * 1000;

  if (isFresh) {
    // cached.problems is an array of Mongoose SUBDOCUMENTS, not plain
    // objects - spreading a subdocument later (`{ ...p }` in
    // buildRecommendations) does not reliably preserve array-typed paths
    // like `tags`, which is what caused "Cannot read properties of
    // undefined (reading '0')" downstream. .toObject() converts every
    // element to a plain JS object up front so the rest of the pipeline
    // can treat these exactly like the freshly-fetched-from-CF shape.
    return cached.problems.map((p) => (typeof p.toObject === "function" ? p.toObject() : p));
  }

  const res = await axios.get(`${CF_BASE_URL}/problemset.problems`);
  if (res.data.status !== "OK" || !res.data.result || !Array.isArray(res.data.result.problems)) {
    // If CF is unreachable or returns an unexpected shape but we have a
    // stale cache, better to serve stale data than to fail the whole
    // recommendation request with a raw indexing error.
    if (cached) return cached.problems;
    throw new Error("Could not load problem set from Codeforces");
  }

  const problems = res.data.result.problems.map((p) => ({
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating || null,
    tags: Array.isArray(p.tags) ? p.tags : [],
  }));

  await ProblemsetCache.findOneAndUpdate(
    { key: "problemset" },
    { key: "problemset", problems, fetchedAt: new Date() },
    { upsert: true }
  );

  return problems;
}

/**
 * Trend signal: tag frequency across a sample of recently-finished contests.
 * Cheap (one contest.list call, already-cached problem tags for the rest)
 * and gives recommendations a "what's showing up lately" lean, not just a
 * static read of the user's own history.
 */
async function getRecentTagFrequency(problems) {
  const res = await axios.get(`${CF_BASE_URL}/contest.list`);
  if (res.data.status !== "OK" || !Array.isArray(res.data.result)) return {};

  const recentFinished = res.data.result
    .filter((c) => c.phase === "FINISHED")
    .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds)
    .slice(0, RECENT_CONTEST_SAMPLE)
    .map((c) => c.id);

  const recentContestIds = new Set(recentFinished);
  const freq = {};

  for (const p of problems) {
    if (!recentContestIds.has(p.contestId)) continue;
    for (const tag of Array.isArray(p.tags) ? p.tags : []) {
      freq[tag] = (freq[tag] || 0) + 1;
    }
  }

  return freq;
}

/**
 * Per-tag weakness score from the user's own solved/attempted history.
 * A tag only counts as "weak" if the user has actually engaged with it and
 * struggled — pure attempt volume with a poor solve rate. Untouched tags
 * (0 attempts) are NOT flagged as weak here; they're a separate, lower-
 * priority signal (see buildRecommendations), because "never tried" and
 * "tried and struggled" call for different recommendations.
 */
function computeWeakTags(tagStats) {
  const weakness = {};
  for (const [tag, s] of Object.entries(tagStats || {})) {
    const attempted = (s.attempted || 0) + (s.solved || 0);
    if (attempted < 3) continue; // not enough signal yet
    const solveRate = (s.solved || 0) / attempted;
    // Weakness grows as solve rate drops, scaled by how much exposure
    // they've had (more attempts on a low solve-rate tag = stronger signal)
    weakness[tag] = (1 - solveRate) * Math.log2(attempted + 1);
  }
  return weakness;
}

/**
 * Core scoring function. Combines three signals into one score per
 * candidate problem:
 *   1. Rating gap fit   — Gaussian-shaped, peaks at current+150, the
 *                          conventional "productive struggle" zone.
 *   2. Weak-tag match    — sum of weakness scores for tags the problem has.
 *   3. Trend relevance   — light boost if the problem's tags are showing
 *                          up in recently-finished contests.
 */
function scoreProblem(problem, { currentRating, weakTags, trendFreq }) {
  if (!problem.rating) return -Infinity; // unrated problems aren't useful practice targets

  const targetRating = currentRating + 150;
  const gap = problem.rating - targetRating;
  // Gaussian centered on targetRating, sigma ~200 — rewards closeness
  // without a hard cutoff, so a slightly-off-target problem with a great
  // tag match can still outscore a perfectly-on-target but irrelevant one.
  const ratingFit = Math.exp(-(gap * gap) / (2 * 200 * 200));

  const tags = Array.isArray(problem.tags) ? problem.tags : [];

  let tagScore = 0;
  for (const tag of tags) {
    tagScore += weakTags[tag] || 0;
  }

  let trendScore = 0;
  for (const tag of tags) {
    trendScore += trendFreq[tag] || 0;
  }
  trendScore = Math.log2(trendScore + 1);

  // Weights: rating fit is the dominant term (a well-matched-difficulty
  // problem is useful regardless of tag), tag weakness is a strong
  // secondary signal (the whole point of "hybrid"), trend is a light tiebreaker.
  return ratingFit * 3 + tagScore * 1.4 + trendScore * 0.3;
}

/**
 * Builds the final recommendation list for a handle.
 *
 * @param {number} currentRating
 * @param {object} tagStats - from the profile's aggregateSubmissions()
 * @param {Set<string>} solvedKeys - "contestId-index" set of problems already solved
 * @param {number} limit
 */
async function buildRecommendations({ currentRating, tagStats, solvedKeys, limit = 12 }) {
  const problems = await getProblemset();
  const [trendFreq] = await Promise.all([getRecentTagFrequency(problems)]);
  const weakTags = computeWeakTags(tagStats);

  const effectiveRating = currentRating || 1200; // unrated users get treated as ~newbie floor

  const scored = [];
  for (const p of problems) {
    const key = `${p.contestId}-${p.index}`;
    if (solvedKeys.has(key)) continue;
    if (!p.rating) continue;
    // Hard bounds so we never suggest something wildly out of range even
    // if the soft Gaussian score would technically allow it through
    if (p.rating < effectiveRating - 200 || p.rating > effectiveRating + 500) continue;

    const score = scoreProblem(p, { currentRating: effectiveRating, weakTags, trendFreq });
    if (score === -Infinity) continue;

    scored.push({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : [],
      score,
      matchedWeakTags: (Array.isArray(p.tags) ? p.tags : []).filter((t) => weakTags[t] > 0),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Diversity pass: avoid returning 12 problems that are all the same tag
  // just because that tag scored highest. Greedily take top-scored problems
  // but cap how many share a primary tag.
  const tagCounts = {};
  const diversified = [];
  for (const p of scored) {
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const primaryTag = tags[0] || "misc";
    tagCounts[primaryTag] = tagCounts[primaryTag] || 0;
    if (tagCounts[primaryTag] >= 3) continue;
    tagCounts[primaryTag] += 1;
    diversified.push(p);
    if (diversified.length >= limit) break;
  }

  return diversified.map((p) => ({
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating,
    tags: p.tags,
    matchedWeakTags: p.matchedWeakTags,
    url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
  }));
}

module.exports = { buildRecommendations, getProblemset };
