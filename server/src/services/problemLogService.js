const ProblemLog = require("../models/ProblemLog");
const { fetchRawCFData } = require("./codeforcesService");

/**
 * Reduces a raw CF submissions array down to one best-status entry per
 * problem, same dedupe rule as codeforcesService.aggregateSubmissions
 * (solved beats attempted, first submission's rating/tags win), but here
 * we also keep the problem metadata (name, contestId, index) since that's
 * what the ProblemLog table needs to render, and codeforcesService's
 * version throws that away after aggregating.
 */
function reduceSubmissionsToProblems(submissions) {
  const byKey = new Map();

  for (const sub of submissions) {
    const problem = sub.problem;
    if (!problem) continue;

    const problemKey = `${problem.contestId || problem.problemsetName}-${problem.index}`;
    const isSolved = sub.verdict === "OK";

    const existing = byKey.get(problemKey);
    if (!existing) {
      byKey.set(problemKey, {
        problemKey,
        contestId: problem.contestId ?? null,
        index: problem.index || null,
        name: problem.name || "",
        rating: typeof problem.rating === "number" ? problem.rating : null,
        tags: problem.tags || [],
        status: isSolved ? "solved" : "attempted",
        lastSubmissionTimeSeconds: sub.creationTimeSeconds || null,
      });
    } else {
      // Upgrade to solved if we find the AC later in the list
      if (isSolved && existing.status !== "solved") {
        existing.status = "solved";
      }
      // Track the most recent submission time we've seen for this problem
      if (sub.creationTimeSeconds && sub.creationTimeSeconds > (existing.lastSubmissionTimeSeconds || 0)) {
        existing.lastSubmissionTimeSeconds = sub.creationTimeSeconds;
      }
    }
  }

  return Array.from(byKey.values());
}

/**
 * Pulls fresh submissions from CF for `handle` and upserts one ProblemLog
 * row per problem for `userId`. Never overwrites starred/note, and never
 * downgrades a problem from solved back to attempted - both are enforced
 * with a single conditional bulk upsert per problem rather than a
 * read-modify-write loop, so this stays reasonably fast even for handles
 * with several thousand submissions.
 */
async function syncProblemLogs(userId, handle) {
  const { submissions } = await fetchRawCFData(handle);
  const problems = reduceSubmissionsToProblems(submissions);

  if (problems.length === 0) {
    return { synced: 0 };
  }

  const bulkOps = problems.map((p) => ({
    updateOne: {
      filter: { user: userId, problemKey: p.problemKey },
      update: [
        {
          $set: {
            user: userId,
            problemKey: p.problemKey,
            contestId: p.contestId,
            index: p.index,
            name: p.name,
            rating: p.rating,
            tags: p.tags,
            lastSubmissionTimeSeconds: p.lastSubmissionTimeSeconds,
            // Solved is sticky: only move to "solved", or keep whatever
            // status already existed, never regress solved -> attempted.
            status: {
              $cond: [
                { $eq: ["$status", "solved"] },
                "solved",
                p.status,
              ],
            },
            // starred/note are left untouched entirely - they simply
            // aren't part of this $set, so Mongo leaves existing values
            // alone on update and applies schema defaults on insert.
          },
        },
      ],
      upsert: true,
    },
  }));

  const result = await ProblemLog.bulkWrite(bulkOps, { ordered: false });
  return { synced: problems.length, result };
}

/**
 * Returns all ProblemLog rows for a user, most recently submitted first.
 * Does NOT sync - call syncProblemLogs first if fresh data is needed,
 * keeping the read path fast and the write/sync path explicit.
 */
async function getProblemLogs(userId) {
  return ProblemLog.find({ user: userId }).sort({ lastSubmissionTimeSeconds: -1 }).lean();
}

module.exports = { syncProblemLogs, getProblemLogs, reduceSubmissionsToProblems };
