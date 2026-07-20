const axios = require("axios");

const CF_BASE_URL = "https://codeforces.com/api";

// Difficulty buckets we bucket solved problems into. Codeforces ratings
// go from 800 to 3500 in steps of 100, so grouping into ranges of 200-300
// keeps the bar chart readable instead of having 25 tiny bars.
const DIFFICULTY_RANGES = [
  { label: "800-1000", min: 800, max: 1000 },
  { label: "1100-1300", min: 1100, max: 1300 },
  { label: "1400-1600", min: 1400, max: 1600 },
  { label: "1700-1900", min: 1700, max: 1900 },
  { label: "2000-2200", min: 2000, max: 2200 },
  { label: "2300-2500", min: 2300, max: 2500 },
  { label: "2600+", min: 2600, max: Infinity },
];

function getDifficultyBucket(rating) {
  const bucket = DIFFICULTY_RANGES.find((r) => rating >= r.min && rating <= r.max);
  return bucket ? bucket.label : "Unrated";
}

/**
 * Fetches raw user.info, user.rating, and user.status from Codeforces.
 * Throws an error with a clear message if the handle doesn't exist or
 * the API returns a non-OK status (CF API returns 200 even on logical
 * errors, so we have to check the "status" field ourselves).
 */
async function fetchRawCFData(handle) {
  const [infoRes, ratingRes, statusRes] = await Promise.all([
    axios.get(`${CF_BASE_URL}/user.info?handles=${handle}`),
    // user.rating fails with comment "not rated" for unrated/newbie users
    // (any handle with zero rated contests) - we treat that as an empty
    // rating history instead of letting Promise.all reject. NOTE: the
    // fallback shape must use "result" (not "response") to match what a
    // real CF response looks like, since fetchRawCFData always reads
    // ratingRes.data.result below.
    axios.get(`${CF_BASE_URL}/user.rating?handle=${handle}`).catch((err) => {
      if (err.response && err.response.data && err.response.data.comment) {
        return { data: { status: "OK", result: [] } };
      }
      throw err;
    }),
    axios.get(`${CF_BASE_URL}/user.status?handle=${handle}`),
  ]);

  if (infoRes.data.status !== "OK" || !infoRes.data.result || !infoRes.data.result[0]) {
    throw new Error("Handle not found on Codeforces");
  }

  return {
    userInfo: infoRes.data.result[0],
    ratingHistory: ratingRes.data.result || [],
    submissions: statusRes.data.result || [],
  };
}

/**
 * Turns the raw submissions array into the two aggregations our charts need:
 * 1. difficultyBuckets: solved-problem counts per rating range
 * 2. tagStats: per-tag solved vs attempted-but-never-solved counts
 *
 * A user can submit the same problem many times (WA, TLE, then AC), so we
 * dedupe by problem ID first and track the BEST verdict we ever saw for
 * each problem before bucketing anything.
 */
function aggregateSubmissions(submissions) {
  const problemBestStatus = new Map(); // problemKey -> { solved, rating, tags }

  for (const sub of submissions) {
    const problem = sub.problem;
    if (!problem) continue;

    // contestId + index uniquely identifies a problem on Codeforces
    const problemKey = `${problem.contestId || problem.problemsetName}-${problem.index}`;
    const isSolved = sub.verdict === "OK";

    const existing = problemBestStatus.get(problemKey);
    if (!existing) {
      problemBestStatus.set(problemKey, {
        solved: isSolved,
        rating: problem.rating,
        tags: problem.tags || [],
      });
    } else if (isSolved && !existing.solved) {
      // upgrade attempted -> solved if we find the accepted submission
      existing.solved = true;
    }
  }

  const difficultyBuckets = {};
  const tagStats = {};

  for (const { solved, rating, tags } of problemBestStatus.values()) {
    // Difficulty buckets only count SOLVED problems with a known rating
    if (solved && rating) {
      const bucket = getDifficultyBucket(rating);
      difficultyBuckets[bucket] = (difficultyBuckets[bucket] || 0) + 1;
    }

    // Tag stats count both solved and attempted-but-unsolved, per tag
    for (const tag of tags) {
      if (!tagStats[tag]) tagStats[tag] = { solved: 0, attempted: 0 };
      if (solved) {
        tagStats[tag].solved += 1;
      } else {
        tagStats[tag].attempted += 1;
      }
    }
  }

  const totalSolved = Array.from(problemBestStatus.values()).filter((p) => p.solved).length;

  const solvedKeys = new Set(
    Array.from(problemBestStatus.entries())
      .filter(([, p]) => p.solved)
      .map(([key]) => key)
  );

  return { difficultyBuckets, tagStats, totalSolved, solvedKeys };
}

/**
 * Main entry point: fetches raw data + computes aggregations in one shot.
 * This is what the route/controller calls - it doesn't need to know
 * anything about CF API shapes or aggregation logic.
 */
async function buildProfileData(handle) {
  const { userInfo, ratingHistory, submissions } = await fetchRawCFData(handle);
  const { difficultyBuckets, tagStats, totalSolved } = aggregateSubmissions(submissions);

  const cleanRatingHistory = (Array.isArray(ratingHistory) ? ratingHistory : []).map((entry) => ({
    contestId: entry.contestId,
    contestName: entry.contestName,
    rank: entry.rank,
    oldRating: entry.oldRating,
    newRating: entry.newRating,
    ratingUpdateTimeSeconds: entry.ratingUpdateTimeSeconds,
  }));

  return {
    userInfo: {
      rating: userInfo.rating,
      maxRating: userInfo.maxRating,
      rank: userInfo.rank,
      maxRank: userInfo.maxRank,
      titlePhoto: userInfo.titlePhoto,
      contribution: userInfo.contribution,
      friendOfCount: userInfo.friendOfCount,
      registrationTimeSeconds: userInfo.registrationTimeSeconds,
    },
    ratingHistory: cleanRatingHistory,
    difficultyBuckets,
    tagStats,
    summary: {
      totalSolved,
      currentRating: userInfo.rating || 0,
      maxRating: userInfo.maxRating || 0,
      rank: userInfo.rank || "unrated",
    },
  };
}

module.exports = { buildProfileData, DIFFICULTY_RANGES, fetchRawCFData, aggregateSubmissions };
