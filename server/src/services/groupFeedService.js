const axios = require("axios");
const Group = require("../models/Group");
const GroupFeedEntry = require("../models/GroupFeedEntry");
const GroupChallenge = require("../models/GroupChallenge");

const CF_BASE_URL = "https://codeforces.com/api";
const LOOKBACK_SECONDS = 3 * 24 * 3600; // only consider ACs from the last 3 days per poll

/**
 * Pulls a handle's recent accepted submissions once. Used by both the
 * feed poller and the challenge-completion check so we only hit CF's
 * user.status endpoint ONCE per member per poll cycle, rather than once
 * for the feed and again per active challenge - that would multiply CF
 * API calls by the number of open challenges, which doesn't scale.
 */
async function getRecentAccepted(handle) {
  const res = await axios.get(`${CF_BASE_URL}/user.status?handle=${handle}&from=1&count=100`);
  if (res.data.status !== "OK" || !Array.isArray(res.data.result)) return [];

  const cutoff = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
  return res.data.result.filter((s) => s.verdict === "OK" && s.creationTimeSeconds >= cutoff);
}

/**
 * One full poll cycle: for every group, for every member, pull recent ACs,
 * upsert them into the feed, and check them against any open challenges
 * for that group. Designed to be idempotent (safe to run repeatedly) via
 * the unique index on GroupFeedEntry and the solvedBy dedup check below,
 * so a crashed/restarted poll never double-posts.
 */
async function pollAllGroups() {
  const groups = await Group.find({});

  for (const group of groups) {
    const openChallenges = await GroupChallenge.find({
      group: group._id,
      closesAt: { $gte: new Date() },
    });

    for (const member of group.members) {
      let accepted;
      try {
        accepted = await getRecentAccepted(member.handle);
      } catch (err) {
        console.error(`Poll failed for ${member.handle} in group ${group._id}:`, err.message);
        continue; // one member's CF error shouldn't block the rest of the group
      }

      for (const sub of accepted) {
        const entry = {
          group: group._id,
          handle: member.handle,
          contestId: sub.problem.contestId,
          problemIndex: sub.problem.index,
          problemName: sub.problem.name,
          problemRating: sub.problem.rating || null,
          tags: sub.problem.tags || [],
          solvedAtSeconds: sub.creationTimeSeconds,
        };

        // Upsert keyed on the unique (group, handle, contestId, index) index -
        // if this exact solve was already recorded, this is a no-op rather
        // than a duplicate feed entry or a thrown E11000 error.
        await GroupFeedEntry.findOneAndUpdate(
          {
            group: entry.group,
            handle: entry.handle,
            contestId: entry.contestId,
            problemIndex: entry.problemIndex,
          },
          entry,
          { upsert: true }
        );

        // Check this solve against any open challenge for the group
        for (const challenge of openChallenges) {
          if (
            challenge.contestId === sub.problem.contestId &&
            challenge.problemIndex === sub.problem.index &&
            !challenge.solvedBy.some((s) => s.handle === member.handle)
          ) {
            challenge.solvedBy.push({ handle: member.handle, solvedAtSeconds: sub.creationTimeSeconds });
            await challenge.save();
          }
        }
      }
    }
  }
}

// Starts the recurring poll. Called once from server.js. Interval is
// deliberately not too aggressive (10 min) - CF's public API has a
// roughly 1-request/2-second rate limit, and polling every member of
// every group too often risks tripping that under real usage.
function startGroupPolling() {
  const INTERVAL_MS = 10 * 60 * 1000;
  pollAllGroups().catch((err) => console.error("Initial group poll failed:", err.message));
  setInterval(() => {
    pollAllGroups().catch((err) => console.error("Group poll failed:", err.message));
  }, INTERVAL_MS);
}

module.exports = { pollAllGroups, startGroupPolling };
