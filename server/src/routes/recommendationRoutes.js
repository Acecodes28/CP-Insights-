const express = require("express");
const router = express.Router();
const CFProfile = require("../models/CFProfile");
const { fetchRawCFData, aggregateSubmissions } = require("../services/codeforcesService");
const { buildRecommendations } = require("../services/recommendationService");

const CACHE_TTL_HOURS = parseFloat(process.env.CACHE_TTL_HOURS) || 6;

function isCacheFresh(fetchedAt) {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs / (1000 * 60 * 60) < CACHE_TTL_HOURS;
}

// Mongoose Maps (tagStats) need converting to plain objects before the
// scoring functions can do Object.entries() on them.
function mapToObject(map) {
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  return map; // already a plain object (e.g. freshly computed, not from Mongo)
}

// GET /api/recommendations/:handle
// Reuses the existing profile cache when fresh (same TTL as /api/profile) so
// this doesn't double the load on the Codeforces API for a handle someone
// just looked up. Only recomputes solvedKeys fresh each time, since that's
// cheap once we already have the submissions in hand.
router.get("/:handle", async (req, res) => {
  const handle = req.params.handle.toLowerCase().trim();
  if (!handle) {
    return res.status(400).json({ error: "Handle is required" });
  }

  try {
    const cached = await CFProfile.findOne({ handle });
    let tagStats;
    let currentRating;
    let solvedKeys;

    if (cached && isCacheFresh(cached.fetchedAt)) {
      tagStats = mapToObject(cached.tagStats);
      currentRating = cached.summary.currentRating;
      // Cached docs don't store solvedKeys (not part of the CFProfile
      // schema), so we still need one lightweight fetch of user.status to
      // know which problems to exclude. This is the one unavoidable live
      // call — everything else (problemset, trend data) is cached.
      const { submissions } = await fetchRawCFData(handle);
      ({ solvedKeys } = aggregateSubmissions(submissions));
    } else {
      const { userInfo, submissions } = await fetchRawCFData(handle);
      const aggregated = aggregateSubmissions(submissions);
      tagStats = aggregated.tagStats;
      solvedKeys = aggregated.solvedKeys;
      currentRating = userInfo.rating || 0;
    }

    const recommendations = await buildRecommendations({
      currentRating,
      tagStats,
      solvedKeys,
      limit: 12,
    });

    return res.json({ handle, currentRating, recommendations });
  } catch (err) {
    if (err.message === "Handle not found on Codeforces") {
      return res.status(404).json({ error: `Handle "${handle}" not found on Codeforces` });
    }
    console.error("Error building recommendations:", err.message);
    if (process.env.NODE_ENV !== "production") console.error(err.stack);
    return res.status(500).json({ error: "Something went wrong building recommendations" });
  }
});

module.exports = router;
